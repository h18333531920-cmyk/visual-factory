#!/usr/bin/env python3
"""Run on the gateway host. Dry-run by default; never reads image/prompt fields into output.
Only verified ready receipts with an exact SHA256(account ID) owner match are eligible.
"""
import argparse
import collections
import datetime
import fcntl
import hashlib
import json
from pathlib import Path
import urllib.request
import uuid

NAMESPACE = uuid.UUID('aba1711c-1395-4c03-b0a4-d69363b9bf74')

def event_for_job(job, users_by_owner):
    if job.get('status') != 'ready':
        return None
    user = users_by_owner.get(job.get('owner'))
    if not user or user.get('deleted_at'):
        return None
    if job.get('account', {}).get('id', user['id']) != user['id']:
        raise ValueError('receipt account mismatch')
    job_id = str(uuid.UUID(job['id']))
    request = job.get('request', {})
    if request.get('kind') not in ('icons', 'diy'):
        return None
    model = request.get('input', {}).get('model')
    models = {'site-jimeng-lite': 'site-jimeng-lite', 'site-jimeng-pro': 'site-jimeng-pro',
              'jimeng-image-5.0-lite': 'site-jimeng-lite', 'jimeng-image-5.0-pro': 'site-jimeng-pro'}
    if model not in models:
        raise ValueError('unrecognized model')
    model = models[model]
    return {'id': str(uuid.uuid5(NAMESPACE, user['id'] + ':' + job_id)),
            'actor_id': user['id'], 'event_type': 'imagegen',
            'created_at': datetime.datetime.fromtimestamp(job['updatedAt'] / 1000, datetime.timezone.utc).isoformat(),
            'meta': {'job_id': job_id, 'model': model, 'model_label': '即梦 Pro' if model.endswith('pro') else '即梦 Lite',
                     'kind': request['kind'], 'origin': job.get('origin', ''),
                     'account_label': job.get('account', {}).get('label') or user.get('user_metadata', {}).get('display_name', ''),
                     'recovered_from_receipt': True}}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    # Serializes retries of this recovery, without changing task receipts.
    with (args.root / 'data' / '.analytics-backfill.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        config = json.loads((args.root / 'secrets' / 'supabase-analytics.json').read_text())
        headers = {'apikey': config['service_key'], 'Authorization': 'Bearer ' + config['service_key']}
        def request(path, rows=None):
            req = urllib.request.Request(config['url'].rstrip('/') + path,
                data=None if rows is None else json.dumps(rows).encode(),
                headers={**headers, 'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates,return=minimal'})
            with urllib.request.urlopen(req, timeout=30) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        users = []
        for page in range(1, 10001):
            batch = request('/auth/v1/admin/users?per_page=50&page=' + str(page)).get('users', [])
            users.extend(batch)
            if len(batch) < 50: break
        by_owner = {hashlib.sha256(u['id'].encode()).hexdigest(): u for u in users}
        def existing():
            rows = []
            while True:
                batch = request('/rest/v1/vf_asset_events?event_type=eq.imagegen&select=actor_id,meta&order=id&limit=500&offset=' + str(len(rows)))
                rows.extend(batch)
                if len(batch) < 500: break
            return {(r['actor_id'], r['meta'].get('job_id')) for r in rows}
        before = existing()
        candidates = {}
        unmatched = 0
        for path in (args.root / 'data' / 'jobs').rglob('*.json'):
            job = json.loads(path.read_text())
            event = event_for_job(job, by_owner)
            if event:
                key = (event['actor_id'], event['meta']['job_id'])
                if key not in before: candidates[key] = event
            elif job.get('status') == 'ready': unmatched += 1
        print(json.dumps({'mode': 'apply' if args.apply else 'dry-run', 'existing': len(before),
            'missing': len(candidates), 'unmatchedReady': unmatched,
            'byKind': dict(collections.Counter(e['meta']['kind'] for e in candidates.values()))}))
        if not args.apply: return
        rows = list(candidates.values())
        for offset in range(0, len(rows), 50):
            request('/rest/v1/vf_asset_events?on_conflict=id', rows[offset:offset+50])
        after = existing()
        remaining = set(candidates) - after
        print(json.dumps({'verifiedAdded': len(set(candidates) & after), 'remaining': len(remaining), 'total': len(after)}))
        if remaining: raise RuntimeError('backfill verification incomplete')

if __name__ == '__main__': main()
