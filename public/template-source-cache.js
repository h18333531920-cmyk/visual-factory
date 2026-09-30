(function(root) {
  'use strict';
  const abortError = () => Object.assign(new Error('Template request superseded'), { name: 'AbortError' });

  // Keep large Blobs out of the LRU index: scanning all image payloads would
  // recreate the memory spike this cache is intended to prevent.
  function createIndexedDbStore({ maxBytes = 1024 * 1024 * 1024, maxEntries = 80 } = {}) {
    let opened;
    const open = () => opened || (opened = new Promise((resolve, reject) => {
      if (!root.indexedDB) { reject(new Error('Cache unavailable')); return; }
      const request = root.indexedDB.open('vf-template-source-cache', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of ['snapshots', 'metadata']) {
          if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
          db.createObjectStore(name, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Cache blocked'));
    }));
    const transact = async (mode, run) => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['snapshots', 'metadata'], mode); let value;
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Cache aborted'));
        run(tx.objectStore('snapshots'), tx.objectStore('metadata'), result => { value = result; });
      });
    };
    return {
      get: key => transact('readwrite', (snapshots, metadata, done) => {
        const request = snapshots.get(key);
        request.onsuccess = () => { done(request.result || null); };
        const meta = metadata.get(key);
        meta.onsuccess = () => { if (meta.result) metadata.put({ ...meta.result, usedAt: Date.now() }); };
      }),
      removePath: scopePath => transact('readwrite', (snapshots, metadata, done) => {
        const request = metadata.getAll();
        request.onsuccess = () => {
          for (const row of request.result) if (row.scopePath === scopePath) { snapshots.delete(row.key); metadata.delete(row.key); }
          done(true);
        };
      }),
      put: record => transact('readwrite', (snapshots, metadata, done) => {
        if (record.bytes > maxBytes) { done(false); return; }
        const request = metadata.getAll();
        request.onsuccess = () => {
          const remove = key => { snapshots.delete(key); metadata.delete(key); };
          const keep = request.result.filter(old => {
            if (old.key === record.key || old.scopePath === record.scopePath) { remove(old.key); return false; }
            return true;
          }).sort((a, b) => a.usedAt - b.usedAt);
          let bytes = keep.reduce((sum, row) => sum + row.bytes, 0) + record.bytes;
          while (keep.length && (bytes > maxBytes || keep.length >= maxEntries)) {
            const old = keep.shift(); remove(old.key); bytes -= old.bytes;
          }
          const { blob, ...meta } = record;
          snapshots.put({ key: record.key, blob }); metadata.put(meta); done(true);
        };
      })
    };
  }

  function create(options) {
    const store = options.store || createIndexedDbStore();
    const jobs = new Map(), ready = new Set(), failed = new Set(), memory = new Map();
    const pageVersion = String(Date.now()) + Math.random();
    let currentScope = '', epoch = 0, queue = [], catalog = new Map(), priority = [], diskAvailable = true;
    const scope = () => String(options.scope() || '');
    const key = source => JSON.stringify([scope(), source.source_path, source.updated_at || ('page:' + pageVersion), Number(source.source_size_bytes) || 0]);
    const emit = () => options.onProgress?.({
      ready: [...catalog.keys()].filter(id => ready.has(id)).length, total: catalog.size,
      failed: [...catalog.keys()].filter(id => failed.has(id)).length, persistent: diskAvailable
    });
    function clear() {
      epoch++; queue = []; priority = []; catalog.clear(); ready.clear(); failed.clear(); memory.clear();
      for (const job of jobs.values()) job.controller.abort();
      jobs.clear();
    }
    function resetScope() { const next = scope(); if (next !== currentScope) { clear(); currentScope = next; } }
    function retain(id, blob) {
      memory.delete(id); memory.set(id, blob);
      let bytes = [...memory.values()].reduce((n, value) => n + value.size, 0);
      while (memory.size > 8 || bytes > 64 * 1024 * 1024) {
        const oldest = memory.keys().next().value; bytes -= memory.get(oldest).size; memory.delete(oldest);
      }
    }
    async function read(id) {
      if (memory.has(id)) { const blob = memory.get(id); retain(id, blob); return blob; }
      try { return (await store.get(id))?.blob || null; } catch (_) { diskAvailable = false; return null; }
    }
    async function cached(source) {
      resetScope(); const id = key(source), stamp = epoch;
      const blob = await read(id);
      return stamp === epoch && scope() === currentScope ? blob : null;
    }
    function start(source, interactive) {
      resetScope();
      if (!currentScope) return Promise.reject(new Error('Sign in required'));
      const id = key(source); let job = jobs.get(id);
      if (interactive) {
        for (const [otherId, other] of jobs) if (otherId !== id && !other.interactive) other.controller.abort();
      }
      if (job && !job.controller.signal.aborted) { job.interactive ||= interactive; return job.promise; }
      job = { id, source, interactive, epoch, scope: currentScope, controller: new AbortController() };
      const valid = () => !job.controller.signal.aborted && job.epoch === epoch && job.scope === scope();
      jobs.set(id, job);
      job.promise = (async () => {
        let blob = await read(id);
        if (!valid()) throw abortError();
        if (!blob) {
          blob = await options.download(source, { signal: job.controller.signal, scope: job.scope });
          if (!valid()) throw abortError();
          if (!blob || typeof blob.text !== 'function') throw new Error('Invalid template response');
          try {
            const saved = await store.put({ key: id, scopePath: JSON.stringify([job.scope, source.source_path]), blob, bytes: blob.size, usedAt: Date.now() });
            if (saved === false) diskAvailable = false;
          } catch (_) { diskAvailable = false; }
        }
        if (!valid()) throw abortError();
        retain(id, blob); ready.add(id); failed.delete(id); emit(); return blob;
      })().catch(error => {
        if (job.epoch === epoch && job.scope === scope()) {
          if (error.name === 'AbortError') {
            if (catalog.has(id) && !queue.some(item => key(item) === id)) queue.unshift(source);
          } else { failed.add(id); emit(); }
        }
        throw error;
      }).finally(() => {
        if (jobs.get(id) === job) jobs.delete(id);
        queueMicrotask(pump);
      });
      return job.promise;
    }
    function pump() {
      resetScope();
      // One background transfer. An explicit click cancels unrelated work and
      // promotes a matching request; consumers of other requested assets are retained.
      if (jobs.size || !queue.length) return;
      const source = queue.shift();
      if (ready.has(key(source))) { queueMicrotask(pump); return; }
      start(source, false).catch(() => {});
    }
    return {
      key, cached,
      get: source => start(source, true),
      foregroundActive: () => [...jobs.values()].some(job => job.interactive && !job.controller.signal.aborted),
      invalidate: async source => {
        resetScope(); const path = source.source_path, user = currentScope;
        for (const [id, job] of jobs) if (job.source.source_path === path) job.controller.abort();
        for (const id of [...ready]) if (JSON.parse(id)[1] === path) { ready.delete(id); memory.delete(id); }
        try { await store.removePath(JSON.stringify([user, path])); } catch (_) {}
      },
      preload: sources => {
        resetScope();
        catalog = new Map(sources.filter(s => s.source_path).map(s => [key(s), s]));
        const ordered = [...priority.filter(s => catalog.has(key(s))), ...catalog.values()];
        queue = [...new Map(ordered.map(s => [key(s), s])).values()].filter(s => !ready.has(key(s)));
        failed.clear(); emit(); pump();
      },
      prioritize: sources => {
        resetScope(); priority = sources;
        const ordered = [...sources, ...queue];
        for (const source of sources) catalog.set(key(source), source);
        queue = [...new Map(ordered.map(s => [key(s), s])).values()].filter(s => !ready.has(key(s)));
        emit(); pump();
      },
      cancel: () => { clear(); emit(); }
    };
  }
  root.VFTemplateSourceCache = { create, createIndexedDbStore };
})(globalThis);
