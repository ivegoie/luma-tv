# LUMA

[Otvori aplikaciju](https://ivegoie.github.io/luma-tv/)

Samostalno TV web sučelje za Stremio dodatke: katalozi, pretraga, biblioteka, nastavak gledanja, navigacija daljinskim i izravni video izvori.

## Pokretanje na televizoru

1. Ako je LUMA već dodana na TV, pokreni njezinu ikonu među aplikacijama. Za pregled sučelja dostupna je https://ivegoie.github.io/luma-tv/. Registracija nove ikone ovisi o TV-u i kompatibilnom instalacijskom alatu.
2. Odaberi **Prijavi se** i potvrdi Stremio QR/kod na mobitelu.
3. Odaberi izravni izvor iz svojih dodataka. Za kompatibilne izravne izvore ne treba lokalni Stremio server.

Obični torrent izvori ne reproduciraju se izravno u ovoj web aplikaciji. Podrška slike, zvuka i daljinskog ovisi o TV modelu i firmwareu; pokretanje aplikacije potvrđeno je na Hisense VIDAA televizoru, dok kompatibilnost svakog izvora i titlova treba provjeriti na uređaju.

## Novo u 0.6.1

Fokusirana kartica se poveća, a nakon dvije sekunde trailer kreće unutar nje sa zvukom. Prelaskom na drugu karticu prethodni trailer odmah staje i vraća se slika filma ili serije. Ako TV blokira zvuk, pritisni OK kad piše **OK za trailer sa zvukom**. Nema automatskog prelaska na mute. Banner i redovi koriste jedan zajednički scroll; automatski player je u kartici. Cinemeta već daje trailere pa dodatni addon nije potreban. **Postavke → Traileri** uključuje ili isključuje automatske preglede. Traileri ne mijenjaju povijest gledanja.

Automatski pregled dostupan je na TV rasporedu od 900 px širine, uz vidljiv player; na uskom prikazu koristi tipku Trailer. YouTube ili TV mogu ograničiti ugrađivanje i autoplay: ako reprodukcija ne uspije, ostaje slika naslova. Stvarni YouTube trailer potvrđen je u desktop pregledniku; fizički VIDAA prikaz još treba potvrditi. Koristi službeni YouTube iframe ili kompatibilan izravni video, bez lokalnog streaming servera.

## Titlovi i navigacija

Hrvatski titlovi automatski se biraju iz dostupnih ugrađenih/HLS traka i Stremio dodataka. SRT i WebVTT učitavaju se izravno bez lokalnog streaming servera ako izvor dopušta HTTPS/CORS pristup. Tipka **Titlovi** omogućuje ručni izbor ili isključivanje, a **Postavke → Titlovi** sprema zadani izbor. Hrvatski mora postojati i odgovarati izdanju videa; Podržan je i osnovni tekst ASS/SSA prijevoda bez složenih stilova; arhive nisu podržane.

Brže kretanje kroz redove daljinskim, prilagodljiviji raspored i kratke animacije koje poštuju smanjeno kretanje. Za nadogradnju zatvori i ponovno otvori LUMU; postojeća ikona i prijava ostaju.

## Račun i privatnost

Prijava i sinkronizacija idu izravno prema Stremiju. Repozitorij ne sadrži korisničke račune, pristupne ključeve, biblioteku ni privatne adrese dodataka. Ako odabereš ostati prijavljen, prijava i predmemorija čuvaju se u pregledniku tog uređaja. Ne dijeli konfigurirane adrese dodataka jer mogu sadržavati privatni ključ.

## Održavanje

Datoteke u korijenu su objavljena aplikacija; GitHub Pages objavljuje granu `main`. Nema koraka izgradnje ni aplikacijskog backend poslužitelja. Verzija: **0.7.0**.

LUMA je neovisni projekt; nije službena aplikacija Stremija, VIDAA-e, Hisensea ili Netflixa. Licence uključenih biblioteka hls.js i pako nalaze se u `vendor/`. Probni video i kalibracijska slika uključeni su za provjeru playera.

Postavke su na jednoj stranici, sa sažetim nazivima i svim opcijama odmah dostupnima. Normalni pregled naslova nema oznake izvora, stalne poruke o reprodukciji ni upute za daljinski.

Animacije 0.6.1: povezani prijelazi kartica, redova, bannera, izbornika, Postavki i playera. GSAP 3.13.0 isporučuje se lokalno, uz obavijest o licenci. Smanjeno kretanje poštuje postavku uređaja.

Početna 0.6.1 bira drugi naslov bannera pri svakom ulasku. Njegov trailer kreće nakon dvije sekunde fokusa sa zvukom. Dodani su Preporučeno za tebe, Jer si gledao…, Novo, Popularno i Žanrovi. Osobne preporuke koriste stvarno gledane naslove i njihove žanrove iz postojećih dodataka; bez povijesti počinju popularnim naslovima. Banner i kartica međusobno zaustavljaju automatske trailere.

Ispravak 0.6.1 uklanja obavijest o katalozima i popravlja zakazivanje trailera pri fokusiranju bannera koji se pomiče u kadar. Banner ima vlastiti fokus za daljinski i miš.

Puni banner 0.6.1: kada trailer krene, informacije i gumbi animirano nestanu, a player ispuni banner. Po prestanku se vrate. YouTube zadržava omjer slike.

Kartice 0.6.1: naziv i godina animirano se sakriju dok se trailer reproducira; po prestanku se vrate uz izvornu sliku.

U 0.6.1 izostavljen je katalog publicdomainmovies iz prikaza.

0.6.1 dodaje postupno učitavanje kartica, predmemoriju kataloga, gledanje jednim klikom do 4K, sljedeću epizodu uz 15-sekundno odbrojavanje, raspored i skrivanje kategorija te osobne ocjene. Preskoči uvod koristi isključivo javni IntroDB API kad postoje vremena za epizodu: https://introdb.app/docs/api. Postavke i ocjene čuvaju se na uređaju po računu.

Pretraga 0.6.1 automatski kreće pet sekundi nakon zadnjeg znaka; početna uputa za unos je uklonjena.

## Zvuk i traileri 0.6.2

Automatski odabir daje niži prioritet izvorima čije audiooznake uređaj prijavljuje kao nepodržane. Zadržana je kvaliteta do 4K i ručni izbor. Oznake izvora i prijava podrške nisu jamstvo uspješne reprodukcije; LUMA ne pretvara zvuk na TV-u. Player pokreće video s uključenim zvukom i, kada je dostupan popis audiozapisa, uključi prvi samo ako nijedan već nije odabran.

Izravni video/HLS trailer ima prednost kad ga metapodaci dodatka već sadrže. Za ostale ostaje YouTube. Nema novog servisa ni pretplate.

## Instalacija po sustavima

[Otvori mobilni vodič](https://ivegoie.github.io/luma-tv/setup/). Odaberi iPhone ili Android te sustav televizora; prikazuje se jedan korak odjednom. Vodič pokriva Google/Android TV, VIDAA, webOS, Tizen, Fire OS, Vega, Roku, tvOS i druge sustave. Status dostupnosti razlikuje pripremljen projekt, objavljen paket i potvrđenu instalaciju. Nema tvrdnje o univerzalnoj mobilnoj web instalaciji.

Izvorni TV projekti nalaze se u `platforms/`. APK i IPK još nisu objavljeni niti ispitani na fizičkim Android/LG televizorima. Za VIDAA je zadržan postojeći Sidee pomoćnik. Izrada TV APK/IPK paketa ostaje odgođena. Za novi desktop LUMA Setup postoji zasebna izrada s pravom čitanja repozitorija.

## LUMA Setup za Windows i Mac

[Preuzmi LUMA Setup 0.1.0](https://github.com/ivegoie/luma-tv/releases/tag/luma-setup-v0.1.0). Za VIDAA instalaciju korisnik pokreće jedan program s ugrađenim Sideeom i Pythonom, odabire TV, unosi PIN i potvrđuje dodavanje LUMA ikone. Zasebno preuzimanje Sideea nije potrebno. Izvorni kod i licence su u `setup-desktop/`.

Windows x64 i obje Mac inačice prošle su 16 testova postupka te provjere stvarnog samostalnog programa i grafičkog sučelja u svojem Windows/Mac okruženju. Novi omot još nije potvrđen na fizičkom TV-u. Probna izdanja nemaju Windows Authenticode / Apple Developer ID i notarizaciju, pa prvo otvaranje može tražiti dodatnu potvrdu sustava. Mac zahtijeva macOS 15+. Podrška VIDAA modela ovisi o firmwareu.

## Player i TV izvedba 0.7.0

Izvorni jezik i kompatibilnost imaju prednost pred rezolucijom. Jasno označene druge sinkronizacije i snimke iz kina ostaju u odjeljku Ostali izvori za ručni izbor. TV izbor daje prednost AAC-u i lakšim izdanjima. Kad su audiozapisi dostupni kroz TV API ili HLS, bira se jezik iz metapodataka i nudi izbor Zvuk; jezik koji dodatak nije naveo ne može se jamčiti.

OK prikaže kontrole; ponovni OK na traci pauzira/nastavlja. Lijevo/desno premotava po 10 sekundi. Dolje vodi do opcija. Zasebni gumbi za ±10 s i pauzu su uklonjeni; kontrole se skrivaju nakon tri sekunde reprodukcije. Vanjski hrvatski SRT/VTT i osnovni ASS/SSA imaju vlastiti tekstni prikaz, uz HTTPS/CORS dostupnost prijevoda.

Dug ili učestao zastoj može promijeniti automatski odabrani izvor uz zadržavanje pozicije, do tri pokušaja. Ručno odabrani izvor ima Drugi izvor. Nema pretvorbe kodeka ni jamstva da svaki izvor radi. TV preglednici koriste lakše prijelaze, a pozadinsko učitavanje kataloga čeka tijekom filma.

`npm run check` provjerava sintaksu i 106 testova bez pristupa stvarnom računu ili TV-u. Na probnom videu u pregledniku potvrđeni su hrvatski titlovi, skrivanje kontrola, OK i premotavanje; konkretni TorBox izvori i fizički TV trebaju potvrdu korisnika.
