# LUMA

[Otvori aplikaciju](https://ivegoie.github.io/luma-tv/)

Samostalno TV web sučelje za Stremio dodatke: katalozi, pretraga, biblioteka, nastavak gledanja, navigacija daljinskim i izravni video izvori.

## Pokretanje na televizoru

1. Otvori https://ivegoie.github.io/luma-tv/ u TV pregledniku.
2. Odaberi **Prijavi se** i potvrdi Stremio QR/kod na mobitelu.
3. Odaberi izravni izvor iz svojih dodataka. Za kompatibilne izravne izvore ne treba lokalni Stremio server.

Obični torrent izvori ne reproduciraju se izravno u ovoj web aplikaciji. Podrška slike, zvuka i daljinskog ovisi o TV modelu i firmwareu; fizički VIDAA TV još nije potvrđen.

## Račun i privatnost

Prijava i sinkronizacija idu izravno prema Stremiju. Repozitorij ne sadrži korisničke račune, pristupne ključeve, biblioteku ni privatne adrese dodataka. Ako odabereš ostati prijavljen, prijava i predmemorija čuvaju se u pregledniku tog uređaja. Ne dijeli konfigurirane adrese dodataka jer mogu sadržavati privatni ključ.

## Održavanje

Datoteke u korijenu su objavljena aplikacija; GitHub Pages objavljuje granu `main`. Nema koraka izgradnje ni aplikacijskog backend poslužitelja. Verzija: **0.2.1**.

LUMA je neovisni projekt; nije službena aplikacija Stremija, VIDAA-e, Hisensea ili Netflixa. Licence uključenih biblioteka hls.js i pako nalaze se u `vendor/`. Probni video i kalibracijska slika uključeni su za provjeru playera.
