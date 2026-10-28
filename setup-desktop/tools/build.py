"""Build on each native OS. No signing credentials or user TV state are collected."""
from pathlib import Path
import hashlib
import importlib.metadata
import json
import os
import platform
import plistlib
import shutil
import struct
import subprocess
import sys
import tempfile
import urllib.request

ROOT=Path(__file__).resolve().parent.parent
def run(*args,**options):return subprocess.run([str(a) for a in args],check=True,**options)
def build():
    if sys.platform not in ('win32','darwin'):raise RuntimeError('Build on Windows or macOS.')
    (ROOT/'build').mkdir(exist_ok=True)
    # Preserve the notices belonging to the actual interpreter/freezer in this build.
    python_license=ROOT/'licenses/PYTHON-LICENSE.txt'
    for license_path in (Path(sys.base_prefix)/'LICENSE.txt',Path(sys.base_prefix)/'LICENSE'):
        if license_path.is_file():shutil.copy2(license_path,python_license);break
    else:
        version='.'.join(str(v) for v in sys.version_info[:3])
        with urllib.request.urlopen('https://raw.githubusercontent.com/python/cpython/v'+version+'/LICENSE',timeout=30) as response:
            python_license.write_bytes(response.read())
    for dependency,label in [('pyinstaller','PYINSTALLER')]:
        distribution=importlib.metadata.distribution(dependency)
        for file in distribution.files:
            if file.name in ('COPYING.txt','LICENSE.txt') and ('.dist-info/' in str(file)):
                shutil.copy2(distribution.locate_file(file),ROOT/'licenses'/f'{label}-LICENSE.txt');break
    png=(ROOT/'assets/icon-windows.png').read_bytes()
    if sys.platform=='darwin':
        iconset=ROOT/'build/LUMA Setup.iconset';iconset.mkdir(exist_ok=True)
        for size in (16,32,128,256,512):
            for scale in (1,2):
                suffix='@2x' if scale==2 else ''
                run('sips','-z',size*scale,size*scale,ROOT/'assets/icon.png','--out',iconset/f'icon_{size}x{size}{suffix}.png',stdout=subprocess.DEVNULL)
        run('iconutil','-c','icns',iconset,'-o',ROOT/'build/LUMA Setup.icns')
    else:
        # Windows supports a PNG image embedded in an ICO container.
        width,height=struct.unpack('>II',png[16:24])
        if max(width,height)>256:
            raise RuntimeError('Windows ICO source must be 256px or smaller.')
        header=struct.pack('<HHH',0,1,1)+struct.pack('<BBBBHHII',width%256,height%256,0,0,1,32,len(png),22)
        (ROOT/'build/LUMA Setup.ico').write_bytes(header+png)
    run(sys.executable,'-m','PyInstaller','--noconfirm','--clean','--distpath',ROOT/'dist',
        '--workpath',ROOT/'build/pyinstaller',ROOT/'packaging/luma.spec',cwd=ROOT)
    dist=ROOT/'dist';out=ROOT/'release';out.mkdir(exist_ok=True)
    if sys.platform=='win32':
        executable=dist/'LUMA Setup.exe'
        run(executable,'--self-test',timeout=30)
        run(executable,'--gui-self-test',timeout=30)
        shutil.copy2(executable,out/'LUMA-Setup-Windows-x64.exe')
    else:
        app=dist/'LUMA Setup.app';executable=app/'Contents/MacOS/LUMA Setup'
        resources=app/'Contents/Resources'
        with (app/'Contents/Info.plist').open('rb') as f:meta=plistlib.load(f)
        if not meta.get('NSLocalNetworkUsageDescription'):raise RuntimeError('Missing network permission description.')
        for name in ['assets/icon.png','sidee_core/tv-client.bundle','licenses/SIDEE-MIT.txt','licenses/PAHO-LICENSE.txt']:
            if not (resources/name).is_file():raise RuntimeError('Missing bundled resource: '+name)
        if not list(app.rglob('init.tcl')) or not list(app.rglob('tk.tcl')):raise RuntimeError('Missing Tcl/Tk runtime.')
        run('codesign','--verify','--deep','--strict',app)
        run(executable,'--self-test',timeout=30)
        run(executable,'--gui-self-test',timeout=30)
        arch='arm64' if platform.machine()=='arm64' else 'x64'
        archive=out/f'LUMA-Setup-Mac-{arch}.app.zip'
        run('ditto','-c','-k','--sequesterRsrc','--keepParent',app,archive)
        with tempfile.TemporaryDirectory(prefix='luma-setup-dmg-') as tmp:
            stage=Path(tmp)/'LUMA Setup';stage.mkdir()
            run('ditto',app,stage/app.name)
            (stage/'Applications').symlink_to('/Applications',target_is_directory=True)
            shutil.copy2(ROOT/'README.md',stage/'README.md')
            run('hdiutil','create','-volname','LUMA Setup','-srcfolder',stage,'-format','UDZO','-ov',out/f'LUMA-Setup-Mac-{arch}.dmg')
        run('hdiutil','verify',out/f'LUMA-Setup-Mac-{arch}.dmg')
    hashes=[]
    for file in sorted(out.iterdir()):
        if file.suffix in ('.exe','.dmg','.zip'):hashes.append(hashlib.sha256(file.read_bytes()).hexdigest()+'  '+file.name)
    (out/'SHA256SUMS.txt').write_text('\n'.join(hashes)+'\n')
    print('Built self-contained LUMA Setup; no TV was contacted.')
if __name__=='__main__':build()
