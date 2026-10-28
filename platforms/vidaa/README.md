# LUMA za VIDAA

Ovaj pomoćnik dodaje samo LUMA ikonu preko postojeće, PIN-odobrene Sidee veze. Sidee se tijekom instalacije izvršava na Windowsu ili Macu; otvaranje njegova dashboarda mobitelom još uvijek traži to računalo. Nakon registracije ikone računalo nije potrebno za pokretanje LUME s HTTPS hostinga.

1. Preuzmi [Sidee](https://github.com/Empi9245/Sidee) i upari vlastiti TV PIN-om koji TV pokaže. Podrška ovisi o modelu i firmwareu.
2. Preuzmi `register-luma.py` iz ove mape. Potreban je pouzdani Sidee izvorni direktorij koji sadrži `core/client.py` i njegova Python okolina s ovisnostima. Desktop Sidee aplikacija sama nije put do izvornog direktorija.
3. U Sideeovoj Python okolini najprije pregledaj plan (bez promjene televizora):

```sh
python3 register-luma.py --url https://ivegoie.github.io/luma-tv/
```

4. Kad je TV uparen, izvrši registraciju, uz stvarnu lokalnu putanju do preuzetog Sidee izvornog direktorija:

```sh
python3 register-luma.py --url https://ivegoie.github.io/luma-tv/ --sidee-source /putanja/do/Sidee --apply
```

5. Na TV-u pokreni Home → Apps → LUMA i prijavi se Stremio QR-om. Pomoćnik provjerava da su prethodni app ID-jevi ostali prisutni. Ne mijenja Stremio Lite ni druge aplikacije.

Ovo je postojeći razvojni postupak s računalom, nije novi mobilni web instaler. Za LUMU je registracija potvrđena na Hisense 50A6K s prijavljenim firmwareom V0000.09.09A.P0930. Potvrda jednog modela nije univerzalna VIDAA kompatibilnost.
