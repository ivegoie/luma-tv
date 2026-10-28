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

Datoteke u korijenu su objavljena aplikacija; GitHub Pages objavljuje granu `main`. Nema koraka izgradnje ni aplikacijskog backend poslužitelja. Verzija: **0.7.5**.

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

## Pretraga i usklađivanje titlova 0.7.1

Točan naslov dolazi prvi u spojenim rezultatima, duplikati i nepovezani naslovi se izostavljaju. Postojeći dodaci za pretraživanje dijele ograničenje upita; petsekundna odgoda ostaje i tijekom sinkronizacije računa. Na javnom Cinemeta odgovoru puni upit Hardcore Henry sada daje naslov tt3072482 kao prvi podudarni rezultat.

Automatski hrvatski titlovi uspoređuju dostupni hash, datoteku, izdanje i epizodu. Bolje podudaranje ima prednost pred prvim odgovorom. Ručni izbor ostaje. U Titlovi → Vrijeme titlova dodani su Ranije/Kasnije po 0,5 s i Vrati na 0. Pomak se poništava pri promjeni prijevoda ili videa.

Nepotpuni podaci dodatka ograničavaju automatsko poravnanje. Vremenski pomak ne može popraviti drugo izdanje koje se sve više razilazi tijekom filma. `npm run check` sada pokriva 122 testa.

## Slabija veza · 0.7.2

U **Postavke → Reprodukcija → Veza** odaberi **Slabija · do 1080p**. Automatski način koristi dostupne podatke preglednika o vezi/štednji podataka; na TV-u bez tih podataka način se bira ručno. Slabija veza ograničava automatski izbor na najviše 1080p (ili niže ako je tako postavljena Kvaliteta) i daje prednost manjim kompatibilnim datotekama. Ručni Ostali izvori ostaju dostupni, uključujući torrent dodatke uz postojeći server. Automatski traileri i dalje kreću nakon 2 sekunde sa zvukom.

Prvi dostupan katalog prikazuje se bez čekanja svih dodataka. Dodatni redovi, žanrovi i slike učitavaju se pri približavanju vidljivom dijelu ekrana; poznate CDN slike koriste manje verzije. Memorijska predmemorija ograničena je na 4 MB / 50 odgovora i odvojena po računu. Zastarjela pretraga se otkazuje, a pristigli rezultati prikazuju se postupno, uz postojeću stanku od 5 sekundi nakon tipkanja. Za vrijeme videa katalog ne pokreće nove prijenose.

HLS biblioteka učitava se tek kad je potrebna. Na slabijoj vezi HLS.js počinje najnižom varijantom, ograničava automatski odabir na 1080p i koristi ograničen međuspremnik. Izvorni TV HLS player upravlja vlastitim varijantama. Za obični MP4 nema pretvorbe kvalitete tijekom reprodukcije: dostupne manje verzije mora dati dodatak, a nepoznata rezolucija izvora ne može se pouzdano ograničiti. Veza i brzina izvora i dalje određuju zastajkivanje.

Provjera: 139 testova i izolirani preglednik bez stvarnog računa. U simulaciji s 10 kataloga na početku su zatražena 2; odgođeni redovi dohvaćeni su pri navigaciji. HLS biblioteka nije preuzeta pri pregledavanju ni pri MP4 reprodukciji. Na jednom izmjerenom Cinemeta/Metahub kadru mala slika ima 28.355 B prema 446.608 B srednje slike. To nije mjerenje svih slika ni fizičkog TV-a.

## Brži izvori i blage TV animacije · 0.7.3

Izvori se prikazuju čim pojedini dodatak odgovori. Automatski izbor čeka najviše 3 sekunde nakon prvog kandidata koji zadovoljava postavljenu kvalitetu, jezik i prijavljenu kompatibilnost; ako su svi dodaci već odgovorili, bira odmah. Dodaci čiji se manifest otkrije dok je izbornik otvoren uključuju se u isti postupak. Kasniji odgovori dopunjuju ručni izbor i kandidate za oporavak, a ne prekidaju video koji se već reproducira. Zatvaranje izbornika i ručni izbor otkazuju automatsko pokretanje. Veliki popisi prikazuju 24 izvora po skupini, uz Još izvora. Nepoznati kodeci i jezici nisu potvrda kompatibilnosti; ostali izvori i torrent dodaci ostaju dostupni ručno prema postojećim postavkama.

Početne skripte izvršavaju se odgođeno i redom. Pako se dohvaća tek za rad s računom/odgledanim epizodama; mrežni upisi čekaju njegovu dostupnost i ponovno provjeravaju aktivni račun. GSAP se na TV-u ne preuzima. Na standardnoj desktop vezi može se dohvatiti u slobodnom vremenu nakon prvog kataloga, osim uz smanjeno kretanje. Statičke početne JS datoteke imaju oko 220 KB prema 329 KB u 0.7.2 (nekomprimirane datoteke; stvarni prijenos ovisi o predmemoriji, računu i načinu rada).

TV dobiva kratke prijelaze fokusa, kartice, slike, naslova i izbornika od približno 120–160 ms, samo preko prozirnosti i transformacije. Proširenje kartice ne animira dimenzije cijelog reda. Smanjeno kretanje se poštuje. Automatski traileri i dalje kreću nakon 2 sekunde sa zvukom.

Postavke → Dijagnostika prikazuju lokalna vremena prvog kataloga, prvog kompatibilnog izvora, odabira i pokretanja videa. Odziv tipki mjeri se od vremenske oznake događaja do sljedećeg kadra i čuva najviše 60 uzoraka, bez neprekidne petlje mjerenja. To ne mjeri ukupnu latenciju fizičkog daljinskog ili zaslona. Memorija JavaScripta prikazuje se samo ako je preglednik prijavljuje; nije ukupni RAM televizora. Podaci se ne šalju niti trajno spremaju. Osvježi mjerenja ponovno očitava trenutačno stanje.

Provjera: 159 testova i izolirani preglednik s uključenim TV načinom. U scenariju s tri dodatka odabran je 1080p izvor nakon približno 3,1 s, prije odgovora sporog dodatka nakon 8 s; kasni bolji izvor nije promijenio video. Provjereni su postupni ručni izbor, nepomicanje fokusa pri dopuni, CSS prijelaz kartice od 150 ms i izostanak Pako/GSAP/HLS preuzimanja pri gostujućem pregledu i izravnom MP4-u. To je simulacija na laptopu; stvarna mjerenja fizičkog Hisensea i dugotrajnog rada još nisu prikupljena.

## Brži prvi prikaz kataloga · 0.7.4

Nakon prvog uspješnog učitavanja LUMA pamti najviše dva početna reda s po 24 naslova. Pri ponovnom otvaranju odmah prikazuje taj mali pregled, a svježi katalog dohvaća u pozadini. Prvo otvaranje bez spremljenog pregleda i dalje ovisi o brzini dodatka. Fokusirana kartica i njezin trailer ne precrtavaju se kad stigne osvježenje. Postojeće lagane animacije nisu mijenjane.

Pregled je lokalni i vezan uz točan račun i konfiguraciju dodataka. Odjava ili promjena računa ga briše, a druga konfiguracija ga ne može koristiti. Svaki red vrijedi najviše 24 sata. Za prijavu bez trajnog spremanja pregled ostaje samo u memoriji. Sadrži samo sažete metapodatke, javne podržane slike i YouTube identifikatore; nema izravnih video/trailer poveznica, adresa dodataka s ključevima, epizoda, povijesti ni napretka. Puna ograničena veličina je 96.000 znakova JSON-a (do približno 192 KB za UTF-16 tekst). Nedostatak prostora ne isključuje postojeće spremanje Stremio prijave; LUMA nastavlja preko mreže. Neuspjela mrežna obnova može zadržati još važeći pregled, a potvrđeno prazni katalozi uklanjaju stari pregled.

Uklonjeni su dvostruko početno iscrtavanje, ponovljeno čitanje biblioteke i nepotrebna kopija biblioteke pri početku sinkronizacije. Početni katalozi imaju prednost pred ostalim zahtjevima; postojeći zadani katalog i zadnji spremljeni početni izvori obrađuju se ranije. Svi korisnikovi dodaci i dalje ostaju dostupni. Prvi pristigli katalog više nema obveznu dodatnu stanku od 80 ms.

Dijagnostika odvaja Prvi katalog od Svježi katalog: prvi može biti spremljeni prikaz, drugi pokazuje vrijeme dolaska odgovora za obnovu. U izoliranom TV prikazu na laptopu, uz namjerno kašnjenje filmskog kataloga od 2,5 s, prethodna verzija je prvi katalog zabilježila nakon 2634 ms, nova bez predmemorije nakon 2599 ms, a novo ponovno otvaranje nakon 58 ms uz svježi odgovor nakon 2565 ms. To su pojedinačna kontrolirana mjerenja, bez tvrdnje o jednakim vremenima na fizičkom TV-u. Provjereno je očuvanje fokusa dok pozadinska obnova vraća izmijenjene naslove. Svih 171 testova prolazi, uključujući istek, promjenu računa/dodataka, privatnost, prijavu samo za sesiju, oštećene podatke i nedostatak prostora.

## Veći tekst fokusirane kartice · 0.7.5

Naziv fokusiranog filma ili serije povećan je s 0,91 na 1,2 rem, a godina/prateći tekst s 0,75 na 0,95 rem. Promjenom fokusa prethodna kartica vraća običnu veličinu. Postojeće lagane animacije i skrivanje teksta tijekom trailera ostaju. Provjereno u pregledniku pri prelasku fokusa između kartica.
