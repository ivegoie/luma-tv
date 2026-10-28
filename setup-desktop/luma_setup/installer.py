"""Single-app Sidee adapter. No account import, app removal or arbitrary URLs."""
from __future__ import annotations
import ipaddress
import json
import os
from pathlib import Path
import re
import sys
import threading
import time
from dataclasses import dataclass

APP_ID = "lumatvdebug"
APP_URL = "https://ivegoie.github.io/luma-tv/"
ICON_URL = APP_URL + "assets/icon.png"

class SetupError(Exception):
    def __init__(self, message, *, uncertain=False):
        super().__init__(message)
        self.uncertain = uncertain

class InstanceLock:
    """OS lock, not a stale PID flag: a crash releases it automatically."""
    def __init__(self,path):
        fd=os.open(path,os.O_RDWR|os.O_CREAT,0o600)
        self.file=os.fdopen(fd,'r+b')
        if os.fstat(fd).st_size==0:self.file.write(b'0');self.file.flush()
        self.file.seek(0)
        try:
            if os.name=='nt':
                import msvcrt
                msvcrt.locking(fd,msvcrt.LK_NBLCK,1)
            else:
                import fcntl
                fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except OSError:
            self.file.close()
            raise SetupError('LUMA Setup je već otvoren. Koristi postojeći prozor.') from None
    def close(self):self.file.close()

def resource(name):
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    return base / name

def profile_path():
    override = os.environ.get("LUMA_SETUP_STATE_DIR", "").strip()
    if override:
        return Path(override).expanduser().resolve()
    if sys.platform == "win32":
        return Path(os.environ.get("LOCALAPPDATA", Path.home()/"AppData"/"Local")) / "LUMA Setup"
    if sys.platform == "darwin":
        return Path.home()/"Library"/"Application Support"/"LUMA Setup"
    return Path.home()/".local"/"share"/"luma-setup"

def local_host(value):
    try:
        address = ipaddress.IPv4Address(value.strip())
    except (ValueError, AttributeError):
        raise SetupError("Unesi lokalnu IP adresu televizora, primjerice 192.168.1.20.") from None
    # Explicit home LAN ranges; no DNS, credentials, public targets or loopback.
    if not any(address in ipaddress.IPv4Network(n) for n in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")):
        raise SetupError("TV mora biti na tvojoj kućnoj mreži.")
    return str(address)

def private_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@dataclass(frozen=True)
class TV:
    host: str
    name: str

@dataclass(frozen=True)
class Result:
    already: bool
    app_count: int

class Installer:
    def __init__(self, state=None, client=None, flow=None):
        self.state = Path(state) if state else profile_path()
        self.state.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.environ["SIDEE_STATE_DIR"] = str(self.state)
        self.instance=None
        if client is None:
            self.instance=InstanceLock(self.state/'instance.lock')
            from sidee_core import client
            from sidee_core.pairing import PairingFlow
            # Sidee's bundled certificate is public upstream data, never a user's pairing.
            client._certificate_path = lambda: str(resource("sidee_core/tv-client.bundle"))
            client.log = lambda *_: None
            flow = PairingFlow()
        self.client, self.flow = client, flow
        self.host = None
        self.session = None
        self.pairing_id = None
        self.pin_deadline = 0
        self.lock = threading.Lock()
        self.closed = False

    def discover(self):
        out = []
        for info in self.client.discover(timeout=4):
            try:
                host = local_host(info.host)
            except SetupError:
                continue
            if info.is_vidaa:
                out.append(TV(host, (info.friendly_name or "VIDAA TV")[:100]))
        return out

    def identify(self, host):
        host = local_host(host)
        info = self.client.fetch_descriptor(host)
        if not info or not info.is_vidaa:
            raise SetupError("Na toj adresi nije pronađen kompatibilan VIDAA televizor.")
        return TV(host, (info.friendly_name or "VIDAA TV")[:100])

    def request_pin(self, host):
        self.host = local_host(host)
        self.session = None
        self.pairing_id = None
        reply = self.flow.start(self.host)
        if not reply.get("ok") or not reply.get("pairing_id"):
            raise SetupError("TV nije prikazao PIN. Provjeri mrežu i pokušaj ponovno.")
        self.pairing_id = reply["pairing_id"]
        self.pin_deadline = time.monotonic() + max(0, min(60, reply.get("expires_in", 60)))
        return self.pin_deadline

    def confirm_and_install(self, pin):
        if not re.fullmatch(r"[0-9]{4}", pin):
            raise SetupError("PIN mora imati četiri znamenke.")
        if not self.pairing_id or time.monotonic() >= self.pin_deadline:
            raise SetupError("PIN je istekao. Zatraži novi PIN.")
        reply = self.flow.confirm(self.pairing_id, pin)
        if not reply.get("ok"):
            raise SetupError("PIN nije prihvaćen. Zatraži novi PIN i pokušaj ponovno.")
        self.pairing_id = None
        self.session = self.client.Session.load()
        if self.session.host != self.host:
            raise SetupError("Veza ne odgovara odabranom TV-u. Poveži televizor ponovno.")
        return self.install()

    def _apps(self):
        apps = self.client.list_tiles(self.session)
        if not isinstance(apps, list) or not apps or not all(isinstance(a, dict) and a.get("appId") for a in apps):
            raise SetupError("Ne mogu provjeriti postojeće aplikacije. Instalacija nije pokrenuta.")
        return apps

    def install(self):
        if not self.session or self.closed:
            raise SetupError("Najprije poveži televizor PIN-om.")
        if not self.lock.acquire(blocking=False):
            raise SetupError("Instalacija je već u tijeku.")
        try:
            before = self._apps()
            existing = [a for a in before if str(a["appId"]).lower() == APP_ID]
            if existing:
                if all(self.client.tile_matches_request(a, APP_ID, APP_URL) for a in existing):
                    return Result(True, len(before))
                raise SetupError("Postojeća LUMA ima drugu ili nepoznatu adresu. Ništa nije promijenjeno.")
            # Back up only in the app's private state. The public program never contains these data.
            private_json(self.state/"backups"/("apps-"+str(time.time_ns())+".json"), before)
            try:
                after = self.client.add_tile(self.session, APP_ID, "LUMA", APP_URL, ICON_URL)
            except Exception:
                raise SetupError("TV nije potvrdio dovršetak. Provjeri postoji li LUMA ikona prije ponovne instalacije.", uncertain=True) from None
            if not isinstance(after, list) or not any(self.client.tile_matches_request(a, APP_ID, APP_URL) for a in after):
                raise SetupError("TV nije potvrdio LUMA ikonu. Provjeri instalaciju; naredba se neće automatski ponoviti.", uncertain=True)
            previous = {str(a["appId"]) for a in before}
            current = {str(a.get("appId")) for a in after if isinstance(a, dict)}
            if not previous.issubset(current):
                raise SetupError("LUMA je dodana, ali TV nije vratio potpun popis prethodnih aplikacija. Provjeri TV ručno.", uncertain=True)
            return Result(False, len(after))
        finally:
            self.lock.release()

    def verify(self):
        if not self.session:
            raise SetupError("Ponovno poveži TV ako je veza istekla.")
        apps = self._apps()
        if not any(self.client.tile_matches_request(a, APP_ID, APP_URL) for a in apps):
            raise SetupError("LUMA ikona nije potvrđena na TV-u.")
        return Result(True, len(apps))

    def launch(self):
        self.verify()
        self.client.launch_tile(self.session, APP_ID, "LUMA", APP_URL)

    def close(self):
        self.closed = True
        self.flow.close()
        if self.instance:self.instance.close()

def self_test():
    """No discovery, TV connection, credential reads, or GUI window."""
    import tkinter
    import paho.mqtt.client
    from sidee_core import client, pairing
    for name in ("assets/icon.png", "sidee_core/tv-client.bundle", "licenses/SIDEE-MIT.txt", "licenses/PAHO-LICENSE.txt"):
        if not resource(name).is_file():
            raise RuntimeError("Nedostaje ugrađena datoteka: "+name)
    raw = resource("sidee_core/tv-client.bundle").read_bytes()
    decoded = client.zlib_dec(raw)
    if b"-----END CERTIFICATE-----" not in decoded or b"PRIVATE KEY-----" not in decoded:
        raise RuntimeError("Ugrađeni certifikat nije ispravan.")
    del decoded
    print("LUMA Setup: bundled Python/Tk, MQTT, certificate and licenses OK. No TV contacted.")
    return 0
