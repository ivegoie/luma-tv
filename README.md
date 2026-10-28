# LUMA

[Otvori aplikaciju](https://ivegoie.github.io/luma-tv/)

Samostalno TV web sučelje za Stremio dodatke: katalozi, pretraga, biblioteka, nastavak gledanja, navigacija daljinskim i izravni video izvori.

## Pokretanje na televizoru

1. Ako je LUMA već dodana na TV, pokreni njezinu ikonu među aplikacijama. Za pregled sučelja dostupna je https://ivegoie.github.io/luma-tv/. Registracija nove ikone ovisi o TV-u i kompatibilnom instalacijskom alatu.
2. Odaberi **Prijavi se** i potvrdi Stremio QR/kod na mobitelu.
3. Odaberi izravni izvor iz svojih dodataka. Za kompatibilne izravne izvore ne treba lokalni Stremio server.

Obični torrent izvori ne reproduciraju se izravno u ovoj web aplikaciji. Podrška slike, zvuka i daljinskog ovisi o TV modelu i firmwareu; pokretanje aplikacije potvrđeno je na Hisense VIDAA televizoru, dok kompatibilnost svakog izvora i titlova treba provjeriti na uređaju.

## Novo u 0.4.4

Fokusirana kartica se poveća, a nakon dvije sekunde trailer kreće unutar nje sa zvukom. Prelaskom na drugu karticu prethodni trailer odmah staje i vraća se slika filma ili serije. Ako TV blokira zvuk, pritisni OK kad piše **OK za trailer sa zvukom**. Nema automatskog prelaska na mute. Banner i redovi koriste jedan zajednički scroll; automatski player je u kartici. Cinemeta već daje trailere pa dodatni addon nije potreban. **Postavke → Traileri** uključuje ili isključuje automatske preglede. Traileri ne mijenjaju povijest gledanja.

Automatski pregled dostupan je na TV rasporedu od 900 px širine, uz vidljiv player; na uskom prikazu koristi tipku Trailer. YouTube ili TV mogu ograničiti ugrađivanje i autoplay: ako reprodukcija ne uspije, ostaje slika naslova. Stvarni YouTube trailer potvrđen je u desktop pregledniku; fizički VIDAA prikaz još treba potvrditi. Koristi službeni YouTube iframe ili kompatibilan izravni video, bez lokalnog streaming servera.

## Titlovi i navigacija

Hrvatski titlovi automatski se biraju iz dostupnih ugrađenih/HLS traka i Stremio dodataka. SRT i WebVTT učitavaju se izravno bez lokalnog streaming servera ako izvor dopušta HTTPS/CORS pristup. Tipka **Titlovi** omogućuje ručni izbor ili isključivanje, a **Postavke → Titlovi** sprema zadani izbor. Hrvatski mora postojati i odgovarati izdanju videa; ASS/SSA i arhive nisu podržani.

Brže kretanje kroz redove daljinskim, prilagodljiviji raspored i kratke animacije koje poštuju smanjeno kretanje. Za nadogradnju zatvori i ponovno otvori LUMU; postojeća ikona i prijava ostaju.

## Račun i privatnost

Prijava i sinkronizacija idu izravno prema Stremiju. Repozitorij ne sadrži korisničke račune, pristupne ključeve, biblioteku ni privatne adrese dodataka. Ako odabereš ostati prijavljen, prijava i predmemorija čuvaju se u pregledniku tog uređaja. Ne dijeli konfigurirane adrese dodataka jer mogu sadržavati privatni ključ.

## Održavanje

Datoteke u korijenu su objavljena aplikacija; GitHub Pages objavljuje granu `main`. Nema koraka izgradnje ni aplikacijskog backend poslužitelja. Verzija: **0.4.4**.

LUMA je neovisni projekt; nije službena aplikacija Stremija, VIDAA-e, Hisensea ili Netflixa. Licence uključenih biblioteka hls.js i pako nalaze se u `vendor/`. Probni video i kalibracijska slika uključeni su za provjeru playera.

Postavke su na jednoj stranici, sa sažetim nazivima i svim opcijama odmah dostupnima. Normalni pregled naslova nema oznake izvora, stalne poruke o reprodukciji ni upute za daljinski.
