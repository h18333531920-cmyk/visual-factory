import importlib.util
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('backfill', Path(__file__).parents[1] / 'scripts/backfill-imagegen-analytics.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.users = {'owner': {'id':'11111111-1111-4111-8111-111111111111','user_metadata':{'display_name':'同事'}}}
        self.job = {'id':'22222222-2222-4222-8222-222222222222','owner':'owner','status':'ready','updatedAt':1789990000000,'request':{'kind':'diy','input':{'model':'jimeng-image-5.0-pro','prompt':'PRIVATE'}},'source':'PRIVATE_IMAGE'}
    def test_recovery_has_stable_id_original_time_and_no_private_payload(self):
        a=module.event_for_job(self.job,self.users);b=module.event_for_job(self.job,self.users)
        self.assertEqual(a,b);self.assertEqual(a['meta']['model'],'site-jimeng-pro');self.assertTrue(a['created_at'].startswith('2026-09-21'))
        self.assertNotIn('PRIVATE',str(a));self.assertEqual(a['actor_id'],self.users['owner']['id'])
    def test_no_failed_unknown_or_deleted_accounts(self):
        self.assertIsNone(module.event_for_job({**self.job,'status':'failed'},self.users))
        self.assertIsNone(module.event_for_job(self.job,{}))
        self.users['owner']['deleted_at']='deleted';self.assertIsNone(module.event_for_job(self.job,self.users))
    def test_rejects_conflicting_identity(self):
        with self.assertRaises(ValueError):module.event_for_job({**self.job,'account':{'id':'someone-else'}},self.users)
if __name__ == '__main__': unittest.main()
