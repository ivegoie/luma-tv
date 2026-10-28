#!/usr/bin/env python3
"""Register only the new LUMA tile using an existing, trusted Sidee source checkout.

Default is a dry run: no imports from Sidee, no TV connection, no credential access.
The explicit --apply mode requires the user's existing PIN-authorized Sidee session.
"""
import argparse
import importlib
import ipaddress
import json
import os
from pathlib import Path
import sys
import time
from urllib.parse import urlsplit, urlunsplit, urljoin

APP_ID = "lumatvdebug"

def hosted_url(value):
    u = urlsplit(value)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.query or u.fragment:
        raise ValueError("Use a stable HTTPS app URL without credentials, query or fragment.")
    if u.hostname == "localhost" or u.hostname.endswith(".localhost"):
        raise ValueError("The app must be hosted independently of this laptop.")
    try:
        address = ipaddress.ip_address(u.hostname)
    except ValueError:
        address = None
    if address and (address.is_loopback or address.is_unspecified):
        raise ValueError("Loopback URLs cannot be opened by the TV.")
    path = u.path or "/"
    if not path.endswith(("/", ".html")):
        path += "/"
    return urlunsplit((u.scheme, u.netloc, path, "", ""))

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--url", required=True, help="Permanent HTTPS URL of the deployed public/ folder")
    p.add_argument("--sidee-source", type=Path, help="Trusted Sidee source folder containing core/client.py")
    p.add_argument("--apply", action="store_true", help="Actually add the separate LUMA launcher tile")
    p.add_argument("--backup-dir", type=Path, default=Path.cwd()/"luma-install-backups")
    a = p.parse_args()
    try:
        url = hosted_url(a.url)
    except ValueError as e:
        p.error(str(e))
    image = urljoin(url, "assets/icon.png")
    print(json.dumps({"mode":"apply" if a.apply else "dry run", "app_id":APP_ID,
                      "name":"LUMA", "url":url, "image":image,
                      "operation":"Add this single tile; never remove other applications."}, indent=2))
    if not a.apply:
        print("No TV connection or changes made. Add --apply after reviewing the URL and instructions.")
        return 0
    if not a.sidee_source or not (a.sidee_source/"core"/"client.py").is_file():
        p.error("--sidee-source must point to a trusted Sidee source checkout.")
    sys.path.insert(0,str(a.sidee_source.resolve()))
    client = importlib.import_module("core.client")
    expected = (a.sidee_source/"core"/"client.py").resolve()
    if Path(client.__file__).resolve() != expected:
        raise RuntimeError("Refusing an unexpected Sidee client module.")
    for attr in ("Session","list_tiles","add_tile","tile_matches_request"):
        if not hasattr(client,attr):
            raise RuntimeError("This Sidee version has an incompatible API. Nothing was installed.")
    session = client.Session.load()
    before = client.list_tiles(session)
    if not before:
        raise RuntimeError("Cannot read the TV app list. Stop and check Sidee pairing; no installation attempted.")
    existing = [x for x in before if str(x.get("appId","")).lower() == APP_ID]
    if existing:
        if all(client.tile_matches_request(x,APP_ID,url) for x in existing):
            print("LUMA is already registered at this URL. Nothing changed.")
            return 0
        raise RuntimeError("A tile already uses the LUMA app ID with another URL. Refusing to replace it.")
    a.backup_dir.mkdir(parents=True,exist_ok=True,mode=0o700)
    backup = a.backup_dir/("apps-before-luma-"+str(time.time_ns())+".json")
    fd = os.open(backup,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,"w",encoding="utf-8") as f:
        json.dump(before,f,ensure_ascii=False,indent=2)
    after = client.add_tile(session,APP_ID,"LUMA",url,image)
    if not any(client.tile_matches_request(x,APP_ID,url) for x in after):
        raise RuntimeError("The TV did not confirm LUMA registration. Check the launcher; do not repeatedly install.")
    before_ids = {str(x.get("appId")) for x in before if x.get("appId")}
    after_ids = {str(x.get("appId")) for x in after if x.get("appId")}
    if not before_ids.issubset(after_ids):
        raise RuntimeError("LUMA is registered but the returned list omits previous apps. Check the TV manually. No cleanup or deletion was attempted.")
    print("Confirmed: LUMA registered. Previous app IDs are still present.")
    print("Private pre-install snapshot:",backup)
    print("This confirms the tile only, not remote keys, video codecs, or playback.")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        # Never print the Sidee session or tokens in diagnostics.
        print("Installation stopped:",str(exc),file=sys.stderr)
        sys.exit(1)
