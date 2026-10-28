# LUMA Setup 0.1.0

Jedan program za dodavanje LUMA ikone na kompatibilan VIDAA TV. Sideeova jezgra, Python, MQTT biblioteka i grafičko sučelje uključeni su u preuzimanje. Ne treba zasebno instalirati Sidee ni Python.

1. Preuzmi inačicu za **Windows 10/11 x64**, **Mac Apple Silicon** ili **Mac Intel** (macOS 15+).
2. Pokreni LUMA Setup. Na Macu otvori DMG, povuci aplikaciju u Applications i pokreni je.
3. Odaberi svoj TV na istoj mreži, odaberi **Prikaži PIN**, unesi PIN s televizora i pritisni **Instaliraj LUMU**.
4. Nakon potvrde pokreni LUMU na TV-u i prijavi Stremio QR-om. Setup i računalo poslije nisu potrebni za pokretanje LUMA ikone.

Ako TV nije otkriven, u programu unesi njegovu lokalnu IP adresu. Početna dozvola za kućnu mrežu ili prvo otvaranje programa mogu se pojaviti ovisno o sustavu. Ova probna izdanja nemaju Windows Authenticode potpis ni Apple Developer ID/notarizaciju. Sustav zato može tražiti dodatnu potvrdu. Ne isključuj trajno zaštitu sustava. Appleove upute: https://support.apple.com/en-us/102445.

## Što program radi

- Dodaje isključivo ID `lumatvdebug` s adresom `https://ivegoie.github.io/luma-tv/`.
- PIN i vezu obrađuje lokalno. Ne traži Stremio prijavu u samom Setupu.
- Postojeći Sidee profil ne uvozi i ne mijenja. Vlastita veza i privatni popisi aplikacija su u korisničkoj mapi `LUMA Setup`.
- Prije dodavanja provjerava postojeći popis, čuva lokalnu kopiju i nakon dodavanja provjerava da su prethodni app ID-jevi ostali prisutni. Ne sadrži naredbe za uklanjanje aplikacija.
- Ne ponavlja nejasno završenu instalaciju automatski. Tipka **Provjeri instalaciju** radi samo provjeru.
- Pokretanje LUME na TV-u je zasebna radnja korisnika nakon instalacije.

Podrška ovisi o modelu i firmwareu. Sideeovo dodavanje LUMA ikone prethodno je potvrđeno na Hisense 50A6K / V0000.09.09A.P0930; ovaj novi omot treba potvrditi na stvarnom TV-u. Potvrda ikone nije potvrda podrške svih video/audioformata. Ova verzija nije instalater za LG, Samsung, Android TV ili Roku.

## Razvoj

`python -m pip install -r requirements-build.txt`, zatim `python -m unittest discover -s tests` i `python tools/build.py` na ciljnom sustavu. `python main.py --self-test` provjerava ovisnosti i ugrađene datoteke bez TV-a. `--demo` prikazuje sučelje s lažnim uređajem i PIN-om 1234, bez mreže ili korisničke sesije.

Sidee: https://github.com/Empi9245/Sidee, MIT, revizija u `licenses/SIDEE-SOURCE.json`. Licence Sideea i Paho MQTT-a priložene su i dostupne kroz tipku Licence. LUMA Setup je neovisni projekt i nije službeni VIDAA/Hisense/Stremio proizvod.
