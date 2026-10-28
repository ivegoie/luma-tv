import json
import os
from pathlib import Path
import tempfile
import time
import unittest
from types import SimpleNamespace
from unittest.mock import Mock,patch
from luma_setup.installer import APP_ID,APP_URL,Installer,InstanceLock,SetupError,local_host,profile_path

def tile(id,url='https://other.example/'):
    return {'appId':id,'url':url}

class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.client=Mock();self.flow=Mock()
        self.client.tile_matches_request.side_effect=lambda a,id,url:isinstance(a,dict) and a.get('appId')==id and a.get('url')==url
        self.session=SimpleNamespace(host='192.168.1.20')
        self.app=Installer(self.temp.name,self.client,self.flow);self.app.session=self.session;self.app.host=self.session.host
        self.before=[tile('stremio-lite'),tile('youtube')];self.after=self.before+[tile(APP_ID,APP_URL)]
        self.client.list_tiles.return_value=self.before;self.client.add_tile.return_value=self.after
    def test_adds_only_luma_and_private_backup_preserves_prior_apps(self):
        result=self.app.install();self.assertFalse(result.already)
        self.client.add_tile.assert_called_once_with(self.session,APP_ID,'LUMA',APP_URL,APP_URL+'assets/icon.png')
        backups=list(Path(self.temp.name).glob('backups/*.json'));self.assertEqual(len(backups),1)
        self.assertEqual(json.loads(backups[0].read_text()),self.before)
        if os.name!='nt':self.assertEqual(backups[0].stat().st_mode&0o777,0o600)
    def test_existing_matching_app_is_idempotent(self):
        self.client.list_tiles.return_value=self.after
        self.assertTrue(self.app.install().already);self.client.add_tile.assert_not_called()
    def test_existing_id_with_different_url_cannot_be_replaced(self):
        self.client.list_tiles.return_value=self.before+[tile(APP_ID,'https://different.example/')]
        with self.assertRaises(SetupError):self.app.install()
        self.client.add_tile.assert_not_called()
    def test_empty_or_malformed_app_list_never_starts_install(self):
        for apps in ([],None,[{}],[None]):
            with self.subTest(apps=apps):
                self.client.list_tiles.return_value=apps
                with self.assertRaises(SetupError):self.app.install()
        self.client.add_tile.assert_not_called()
    def test_missing_old_app_is_reported_without_cleanup(self):
        self.client.add_tile.return_value=[tile(APP_ID,APP_URL)]
        with self.assertRaises(SetupError) as raised:self.app.install()
        self.assertTrue(raised.exception.uncertain)
        self.assertEqual(self.client.add_tile.call_count,1)
        self.assertEqual({c[0] for c in self.client.method_calls},{'list_tiles','tile_matches_request','add_tile'})
    def test_network_ambiguity_does_not_replay_install(self):
        self.client.add_tile.side_effect=TimeoutError('private transport detail')
        with self.assertRaises(SetupError) as raised:self.app.install()
        self.assertTrue(raised.exception.uncertain);self.assertNotIn('private',str(raised.exception))
        self.client.add_tile.assert_called_once()
    def test_recovery_check_is_read_only(self):
        self.client.list_tiles.return_value=self.after
        self.assertTrue(self.app.verify().already);self.client.add_tile.assert_not_called()
    def test_wrong_or_expired_pin_cannot_install(self):
        for pin in ('123','abcd','１２３４'):
            with self.assertRaises(SetupError):self.app.confirm_and_install(pin)
        self.app.pairing_id='id';self.app.pin_deadline=time.monotonic()-1
        with self.assertRaises(SetupError):self.app.confirm_and_install('1234')
        self.flow.confirm.assert_not_called();self.client.add_tile.assert_not_called()
    def test_unconfirmed_pairing_cannot_install(self):
        self.app.pairing_id='id';self.app.pin_deadline=time.monotonic()+60;self.flow.confirm.return_value={'ok':False}
        with self.assertRaises(SetupError):self.app.confirm_and_install('1234')
        self.client.add_tile.assert_not_called()
    def test_pairing_with_another_host_cannot_install(self):
        self.app.pairing_id='id';self.app.pin_deadline=time.monotonic()+60;self.flow.confirm.return_value={'ok':True}
        self.client.Session.load.return_value=SimpleNamespace(host='192.168.1.30')
        with self.assertRaises(SetupError):self.app.confirm_and_install('1234')
        self.client.add_tile.assert_not_called()
    def test_only_confirmed_pin_can_reach_install(self):
        self.app.pairing_id='id';self.app.pin_deadline=time.monotonic()+60;self.flow.confirm.return_value={'ok':True}
        self.client.Session.load.return_value=self.session
        self.assertFalse(self.app.confirm_and_install('1234').already)
        self.flow.confirm.assert_called_once_with('id','1234')
    def test_close_cancels_pin_wait_and_blocks_install(self):
        self.app.close();self.flow.close.assert_called_once()
        with self.assertRaises(SetupError):self.app.install()
        self.client.add_tile.assert_not_called()
    def test_busy_install_is_not_duplicated(self):
        self.app.lock.acquire()
        with self.assertRaises(SetupError):self.app.install()
        self.app.lock.release();self.client.add_tile.assert_not_called()
    def test_application_profile_is_separate_from_sidee(self):
        with patch.dict(os.environ,{'LUMA_SETUP_STATE_DIR':''}):
            self.assertNotIn('.sidee',str(profile_path()));self.assertIn('LUMA Setup' if os.name=='nt' or __import__('sys').platform=='darwin' else 'luma-setup',str(profile_path()))
    def test_public_hosts_urls_and_loopback_are_rejected(self):
        for host in ('127.0.0.1','8.8.8.8','http://192.168.1.20','192.168.1.20:80','localhost','user@192.168.1.20'):
            with self.subTest(host=host),self.assertRaises(SetupError):local_host(host)
        self.assertEqual(local_host('192.168.1.20'),'192.168.1.20')
    def test_second_process_lock_is_refused_and_release_allows_reopening(self):
        path=Path(self.temp.name)/'instance.lock';first=InstanceLock(path)
        try:
            with self.assertRaises(SetupError):InstanceLock(path)
        finally:first.close()
        second=InstanceLock(path);second.close()

if __name__=='__main__':unittest.main()
