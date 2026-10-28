import os
from pathlib import Path
root = Path(SPECPATH).parent
is_mac = __import__('sys').platform == 'darwin'
identity = os.environ.get('LUMA_CODESIGN_IDENTITY') or None
a = Analysis([str(root/'main.py')], pathex=[str(root)], binaries=[],
    datas=[(str(root/'assets/icon.png'),'assets'),(str(root/'sidee_core/tv-client.bundle'),'sidee_core'),
           (str(root/'licenses'),'licenses'),(str(root/'LICENSE'),'.'),(str(root/'README.md'),'.')],
    hiddenimports=['tkinter','tkinter.ttk','tkinter.messagebox','sidee_core.client','sidee_core.pairing'],
    hookspath=[],hooksconfig={},runtime_hooks=[],excludes=[],noarchive=False,optimize=0)
pyz = PYZ(a.pure)
common = dict(name='LUMA Setup',debug=False,bootloader_ignore_signals=False,strip=False,upx=False,
              console=False,disable_windowed_traceback=False,argv_emulation=False,
              target_arch=os.environ.get('LUMA_TARGET_ARCH'),codesign_identity=identity,entitlements_file=None)
if is_mac:
    exe=EXE(pyz,a.scripts,[],exclude_binaries=True,**common)
    collection=COLLECT(exe,a.binaries,a.datas,strip=False,upx=False,name='LUMA Setup')
    app=BUNDLE(collection,name='LUMA Setup.app',icon=str(root/'build/LUMA Setup.icns'),
        bundle_identifier='io.github.ivegoie.lumasetup',info_plist={
            'CFBundleName':'LUMA Setup','CFBundleDisplayName':'LUMA Setup',
            'CFBundleShortVersionString':'0.1.0','CFBundleVersion':'1',
            'LSMinimumSystemVersion':'15.0','NSHighResolutionCapable':True,
            'NSLocalNetworkUsageDescription':'LUMA Setup traži tvoj VIDAA TV na kućnoj mreži i povezuje ga PIN-om za instalaciju LUME.'})
else:
    exe=EXE(pyz,a.scripts,a.binaries,a.datas,[],icon=str(root/'build/LUMA Setup.ico'),**common)
