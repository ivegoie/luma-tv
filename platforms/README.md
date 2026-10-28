# LUMA TV paketi

`android-tv/` je zaseban Android TV / Google TV projekt (Android 8.0+). Otvara HTTPS LUMU u TV WebViewu, ima vlastiti launcher, banner, trajnu prijavu i prosljeđuje Back / media tipke postojećem frontend playeru. Ne izlaže JavaScript/native bridge i ne zaobilazi TLS pogreške. Release treba izgraditi i potpisati prije distribucije. Izvorni projekt nije potvrda da APK radi na fizičkom televizoru. Za lokalnu izradu koriste se JDK 17, Gradle 8.13, Android SDK 35 i Android Gradle Plugin 8.13.2.

`webos/` je LG-ov hosted-web-app projekt za `ares-package`, s vlastitim ID-jem `io.github.ivegoie.luma`, ikonama i HTTPS preusmjeravanjem na objavljenu LUMU. Treba izraditi IPK i potvrditi ponašanje na LG televizoru. Developer Mode nije trajna trgovinska instalacija: istek razvojne sesije može ukloniti aplikaciju.

Mobilni web vodič nalazi se u `/setup/`. On prikazuje postupke i preuzimanja kad su dostupna. Ne govori da je TV instaliran nakon pritiska na web gumb i ne pohranjuje PIN, TV ključ ni korisnički račun.

Za Tizen, Vega, Roku i tvOS nisu objavljeni instalacijski paketi. VIDAA koristi zaseban postojeći Sidee pomoćnik. Svi paketi otvaraju aplikaciju s internetskog HTTPS hostinga, bez lokalnog laptopa pri gledanju; kompatibilnost videoizvora ostaje odvojeno pitanje.
