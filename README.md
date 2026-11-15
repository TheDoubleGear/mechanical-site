# Sito del clan MechanicaL (#2Q9YC0UCJ)

Sito statico (un solo `index.html`) con regolamento e classifiche del clan, aggiornato in automatico dall'API ufficiale di Clash of Clans tramite GitHub Actions. Costo: 0 €.

```
API Supercell ──► Proxy RoyaleAPI ──► GitHub Actions (ogni 30 min) ──► data/clan.json ──► GitHub Pages
                  IP 45.79.218.79      scripts/sync.mjs
```

I **membri** il sito li legge da solo a ogni visita dall'API pubblica di ClashKing (`api.clashk.ing`, nessuna chiave). Finché `data/clan.json` non esiste, i punteggi vengono dallo snapshot del foglio Google incluso in `index.html`; i player del foglio non più nel clan sono segnati come *ex membro*.

## Modalità di prova (clan ViCtOrY SqUaD)

Al momento il sito è impostato sul clan **ViCtOrY SqUaD (#CYG089CY)** per provare le pagine con dati veri. `data/clan.json` contiene un'istantanea letta da ClashKing il 14/11/2026: membri, war di ottobre e novembre, CWL di novembre (collegata alla stagione di ottobre). Il piè di pagina mostra "DATI DI PROVA".

Per tornare a MechanicaL:
1. in `index.html` rimetti `const CLAN_TAG="#2Q9YC0UCJ";`
2. in `scripts/sync.mjs` e `.github/workflows/sync.yml` rimetti `#2Q9YC0UCJ` come tag predefinito;
3. cancella `data/clan.json` (lo ricrea la sincronizzazione).

## Messa online in 6 passi

1. **Chiave API.** Vai su https://developer.clashofclans.com, accedi e crea una chiave con IP consentito `45.79.218.79` (è l'IP del proxy RoyaleAPI, che serve perché GitHub Actions non ha un IP fisso).
2. **Repository.** Crea un repository GitHub **pubblico** (con il piano gratuito, GitHub Pages funziona solo sui repository pubblici) e carica tutti i file di questa cartella. La chiave API resta comunque segreta.
3. **Segreto.** Settings → Secrets and variables → Actions → *New repository secret*: `COC_TOKEN` = la chiave del punto 1.
4. **Tag del clan.** Già impostato: `#2Q9YC0UCJ` (MechanicaL). Per cambiarlo aggiungi la variabile `CLAN_TAG` in *Settings → Secrets and variables → Actions → Variables*.
5. **Pages.** Settings → Pages → Source: **GitHub Actions**.
6. **Primo avvio.** Actions → *Sync dati clan e pubblica sito* → *Run workflow*. Dopo un minuto il sito è su `https://<utente>.github.io/<repo>/`.

Il registro war del clan oggi risulta **privato**: rendilo **pubblico** (impostazioni clan nel gioco), altrimenti War e C.W.L. non sono leggibili.

## Cosa è automatico

| Pagina | Fonte | Note |
|---|---|---|
| Giocatori | `/clans/{tag}/members`, `/players/{tag}` | TH, ruolo, red flag. La data di ingresso è quella del primo sync in cui il player compare |
| Donazioni | `/clans/{tag}/members` (campo `donations`) | Contatore ufficiale della stagione. Supercell lo azzera il 1° del mese alle 05:00 UTC, dopo lo storico delle 01:00, quindi lo storico salva il mese completo |
| War | `/clans/{tag}/currentwar` | Salvata ogni 30 min finché è in corso: stelle e TH avversario di entrambi gli attacchi; a fine war gli attacchi mancanti diventano ANF. Il registro war non contiene gli attacchi singoli |
| C.W.L. | `/clans/{tag}/currentwar/leaguegroup` + `/clanwarleagues/wars/{warTag}` | Attacco non fatto, red flag, escluso, nemico non corrispettivo |
| Capitale | `/clans/{tag}/capitalraidseasons` | L'elenco degli attacchi per membro c'è solo per il weekend in corso o appena finito: la sincronizzazione lo salva ogni settimana e non lo sovrascrive più. Weekend a 0 attacchi = −10, solo per chi era già nel clan |
| Giochi del clan | obiettivo *Games Champion* | Base registrata il 22 del mese, punti = differenza (max 4000). Giorni modificabili con `GAMES_START_DAY` / `GAMES_END_DAY` |
| Ammonizioni | automatico (pagina War) | Ogni attacco non fatto (ANF) e ogni attacco su un nemico non assegnato (NA) in War vale un'ammonizione da −10 |

## Accesso admin

Il pulsante **Login admin** in alto a destra apre il popup di accesso. Utente e password non sono scritti qui perché il repository è pubblico: li conosce chi amministra il sito (vedi *Cambiare le credenziali* più sotto).

Da admin puoi modificare:

| Pagina | Cosa |
|---|---|
| CWL | Punti % (punti stella e attacchi non fatti si calcolano dalle Giornate CWL) |
| Giornate CWL | Esito di ogni giornata (Day 1–7: 0–3 stelle, ANF attacco non fatto, AE auto escluso, ESC escluso dal capo), casella NA se ha attaccato un nemico non assegnato, TH attaccato |
| War | Per ognuno dei 2 attacchi: stelle (o ANF), TH attaccato e casella NA; aggiungere ed eliminare colonne aggiunte a mano. Le colonne si numerano da sole (War 1, War 2…) |
| Capitale | Attacchi di ogni weekend (0–6); aggiungere colonne, numerate da sole (Week 1, Week 2…) |
| Donazioni | Truppe donate nel mese, per player (vuoto = dato dell'API, se c'è) |
| Giochi | Punti dell'ultimo evento (0–4000) |

Ogni modifica (numeri, colonne aggiunte o eliminate, valori cancellati, Chiudi/Riapri CWL) compare con un **bordo dorato** finché non la confermi. Nella barra admin, sotto la scritta *Modifica*, ci sono due pulsanti: **Conferma** valida tutte le modifiche fatte finora (i bordi dorati spariscono), **Annulla** le scarta tutte e torna all'ultima conferma.

Le modifiche si salvano come *modifiche manuali* (`manual` dentro `data/clan.json`), sopra ai dati dell'API: la sincronizzazione automatica non le sovrascrive. Restano nel browser di chi le fa finché non le pubblichi: **Dati e API → Copia dati JSON** e incolla il contenuto in `data/clan.json` nel repository.

**Cambiare le credenziali.** Il sito confronta l'impronta SHA-256 di `UTENTE:PASSWORD`, non la password in chiaro. Genera la nuova impronta e sostituisci il valore di `AUTH` in `index.html`:

```bash
printf 'NUOVOUTENTE:NUOVAPASSWORD' | sha256sum
```

**Limite di sicurezza.** Il sito è statico: il login nasconde i controlli ai visitatori ma non impedisce a chi sa programmare di modificare i dati *nel proprio browser*. Non può però cambiare i dati pubblicati, perché per farlo serve accesso in scrittura al repository GitHub. Per un login vero lato server servirebbe un backend (per esempio Cloudflare Access o Supabase).

## Modificare a mano la pagina Benvenuto

Tutti i testi stanno in `index.html`. Il modo più semplice è da GitHub: apri `index.html` → icona della matita (*Edit this file*) → cerca con Ctrl+F → modifica → **Commit changes**. Dopo 1–2 minuti il sito si aggiorna da solo.

| Cosa vuoi cambiare | Dove (cerca nel file) |
|---|---|
| Regole (titoli e punti 1.1, 1.2…) | `const RULES=` |
| Domande frequenti | `const FAQ=` |
| Tabella "Come si fanno i punti" | `Come si fanno i punti` |
| Testo del gruppo WhatsApp | `Gruppo WhatsApp` |
| Descrizione sopra il regolamento | Non è nel file: è la descrizione del clan nel gioco, cambiala lì |
| Livello, war vinte, lega, membri | Non è nel file: arrivano dall'API |
| Immagini di sfondo | Sostituisci `img/day.jpg` (giorno) e `img/night.jpg` (notte) con file dagli stessi nomi |

Ogni regola è una riga così: `["Titolo sezione",["Prima regola.","Seconda regola."]]`. Per aggiungere una regola aggiungi un testo tra virgolette separato da virgola; per una sezione nuova aggiungi un'altra riga `[...]` seguita da virgola. La numerazione (1, 1.1, 1.2…) è automatica. Le FAQ sono coppie `["Domanda?","Risposta."]`.

Attenzione a tre cose: ogni testo sta tra virgolette doppie `"…"`; dentro un testo non usare le virgolette doppie (usa « » o l'apostrofo); non cancellare virgole e parentesi tra un elemento e l'altro. Se dopo il salvataggio il sito appare vuoto, quasi sempre manca una virgola o una virgoletta: apri la cronologia del file su GitHub e confronta con la versione precedente.

La tabella "Come si fanno i punti" è solo testo: se cambi un valore, cambia anche il calcolo vero in `const R=` dentro `index.html` e nella funzione `mult` di `scripts/sync.mjs`.

Per provare le modifiche sul tuo computer prima di pubblicarle: apri la cartella nel terminale, lancia `python3 -m http.server` e visita `http://localhost:8000`.

## Stagioni e classifica per i bonus CWL

I bonus di fine CWL si assegnano con una classifica che somma **la CWL del mese** ai **dati del mese prima** (war, donazioni, capitale, giochi, ammonizioni). Per questo la CWL che si gioca a inizio dicembre conta per la **stagione di novembre**.

| Quando | Cosa succede |
|---|---|
| Durante il mese | La stagione in corso (es. *Stagione Novembre*) raccoglie war, donazioni, capitale, giochi e ammonizioni |
| 1° del mese, dalle 01:00 ora di Roma | La sincronizzazione archivia il mese appena finito: diventa la stagione precedente (es. *Stagione Novembre* mentre la nuova è *Stagione Dicembre*). La nuova stagione riparte da zero, tranne la Capitale |
| Durante la CWL (di solito 1–11) | La CWL viene scritta nella stagione precedente: la sua classifica è quella per i bonus e si aggiorna giornata per giornata |
| Fine CWL | Un admin preme **Chiudi CWL** nella pagina CWL: da quel momento la sincronizzazione non la tocca più e la classifica è definitiva |

Sul sito:

- Classifica, War, Donazioni, Capitale, Giochi e Ammonizioni hanno due pulsanti con il nome del mese (es. **Stagione Ottobre** e **Stagione Novembre**). Gli admin modificano solo la stagione in corso.
- CWL e Giornate CWL mostrano solo la stagione di riferimento (pulsante verde) e, finché la CWL è aperta, gli admin possono correggerne i numeri.
- **Chiudi CWL** chiede una seconda conferma ed è disattivato finché ci sono modifiche non confermate. **Riapri CWL** annulla la chiusura in caso di errore. Come per le altre modifiche admin, la chiusura va pubblicata con *Copia dati JSON* perché la sincronizzazione la rispetti.

Lo storico conserva solo l'ultimo mese chiuso; i mesi più vecchi restano nella cronologia di `data/clan.json` su GitHub. GitHub può ritardare le esecuzioni pianificate di qualche minuto; se un'esecuzione salta, lo storico si fa alla successiva. Per archiviare subito a mano: Actions → *Sync dati clan e pubblica sito* → *Run workflow* → spunta **Archivia subito la stagione in corso**.

Finché non è attiva la sincronizzazione, la stagione precedente mostra i dati importati dal foglio Google del clan.

## Modificare i punteggi

Le regole sono in due punti con gli stessi valori: l'oggetto `R` in `index.html` e la funzione `mult` in `scripts/sync.mjs`.

## Prova in locale

```bash
npx serve .     # oppure: python3 -m http.server
```
