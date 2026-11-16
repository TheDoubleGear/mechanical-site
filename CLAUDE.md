# CLAUDE.md — Sito del clan MechanicaL

Note di progetto per chi lavora su questo repository (Claude Code o una nuova chat). Qui ci sono solo le decisioni finali; la documentazione per l'utente è in `README.md`.

Ultimo aggiornamento: 16/11/2026.

## Cos'è

Sito statico del clan di Clash of Clans **MechanicaL** (`#2Q9YC0UCJ`: dopo la C c'è uno **zero**, non una O). Sostituisce il vecchio foglio Google del clan: regolamento, classifica interna, C.W.L., war, donazioni, capitale, giochi, ammonizioni, elenco giocatori.

- Repository: `TheDoubleGear/mechanical-site` (pubblico).
- Sito: https://thedoublegear.github.io/mechanical-site/ (GitHub Pages, pubblicato dal workflow).
- Proprietario: Ko (account GitHub TheDoubleGear). Non è un programmatore: spiegare in italiano semplice, senza gergo, e dire sempre quali file sono cambiati.

## Stato attuale

- **Modalità di prova attiva.** Il sito legge il clan di prova **ViCtOrY SqUaD (`#CYG089CY`)**. Intestazioni, logo, menu e regole restano quelli di MechanicaL. `data/clan.json` contiene dati del clan di prova.
- Il tag è in tre punti: `const CLAN_TAG=` in `index.html`, `const CLAN =` in `scripts/sync.mjs`, `CLAN_TAG:` in `.github/workflows/sync.yml`.
- Per passare a MechanicaL: mettere `#2Q9YC0UCJ` nei tre punti, cancellare `data/clan.json`, lanciare il workflow a mano. Il registro war di MechanicaL deve essere pubblico nel gioco. **Farlo solo quando Ko lo chiede.**
- Credenziali admin: Ko deve ancora sceglierne di definitive (vedi Admin). Non farsi mai dire la password.

## Struttura

| File | Contenuto |
|---|---|
| `index.html` | Tutto il sito in un solo file: HTML, CSS e JavaScript. Routing con hash (`#home`, `#classifica`, `#cwl`, `#cwl-giornate`, `#war`, `#donazioni`, `#capitale`, `#giochi`, `#ammonizioni`, `#giocatori`, `#dati`). Ogni pagina è una funzione `P.<nome>`. |
| `data/clan.json` | I dati. Lo riscrive la sincronizzazione; contiene anche le modifiche admin (`manual`). |
| `scripts/sync.mjs` | Legge l'API e aggiorna `data/clan.json`. Node 20, nessuna dipendenza. |
| `.github/workflows/sync.yml` | Cron ogni 30 minuti + avvio manuale + pubblicazione su Pages. |
| `img/` | Sfondi: `day.jpg`, `night.jpg` e le versioni sfocate `day-blur.jpg`, `night-blur.jpg`. |
| `README.md` | Documentazione per l'utente (messa online, admin, stagioni). |

Nessun passaggio di build, nessun framework, nessuna libreria esterna. Unica risorsa esterna: Google Fonts (Lilita One, Nunito). Mantenere questa impostazione.

## Regole di lavoro

1. **Lingua.** Testi del sito, documentazione e messaggi di commit in italiano.
2. **Segreti.** La chiave dell'API sta solo nel segreto GitHub `COC_TOKEN`. Mai in un file, in un commit o in un log. Mai scrivere utente e password admin in chiaro: il repository è pubblico.
3. **`data/clan.json` è del bot.** `mechanical-bot` lo aggiorna a ogni sincronizzazione. Non sovrascriverlo con copie vecchie, non modificarlo riga per riga. Se cambia il formato dei dati, mantenere la compatibilità con i dati già salvati o prevedere la conversione nello script.
4. **Pubblicazione.** Va online solo ciò che è su `main`. Un push su `main` che tocca `index.html` o `data/**` ripubblica il sito in 1–2 minuti; le altre modifiche valgono dalla sincronizzazione successiva. Se si lavora su un ramo, la modifica non è online finché non è unita a `main`. Prima di un push fare `git pull --rebase`: il bot fa commit spesso.
5. **Non rinominare né spostare** file e cartelle; non togliere `.nojekyll`.
6. **Grafica.** Stile Clash of Clans: pannelli pergamena e legno, sfondi illustrati. A Ko piace così: non cambiare impostazione, colori o font senza richiesta.
7. **Coerenza delle formule.** Se cambia una regola di punteggio, aggiornare insieme: `const R=` e `score()` in `index.html`, la tabella «Come si fanno i punti» (pagina Benvenuto), il calcolatore «Quanto vale un attacco» (pagina CWL), i testi descrittivi delle pagine, `README.md` e questo file.
8. **Verifica.** Prima di consegnare: `node --check scripts/sync.mjs`, e aprire le pagine toccate (visitatore e admin) controllando che non ci siano errori in console. Riportare a Ko i numeri controllati su un player di esempio.
9. **Un passo alla volta.** Ko chiede modifiche piccole e precise: fare esattamente quelle, segnalare a parte le scelte dubbie invece di decidere in silenzio.

## Punteggi (formule concordate)

Costanti in `const R=` (`index.html`). Moltiplicatore sul TH, con `d = TH avversario − TH del player`:

| d | ≥ +2 | +1 | 0 | −1 | ≤ −2 |
|---|---|---|---|---|---|
| moltiplicatore | 1,5 | 1,25 | 1 | 0,75 | 0,5 |

- **War** (2 attacchi a war): punti stella = Σ (stelle × moltiplicatore) **× 5**. Non esiste una colonna ×5 separata. ANF e NA in War non tolgono punti stella: diventano ammonizioni.
- **Giornate CWL** (1 attacco al giorno): punti stella = Σ (stelle × moltiplicatore) **× 10 − 10 × numero di NA**. Il −10 si toglie dopo il ×10.
- **CWL**:
  - Punti % = somma delle percentuali di distruzione (numero intero, max 700). L'admin può scriverlo a mano.
  - Attacchi non fatti = numero di ANF nelle Giornate CWL (automatico, non modificabile).
  - **Totale CWL = punti stella + (punti % ÷ 35) − 10 × attacchi non fatti.**
- **Donazioni**: `step = min(8, floor(donazioni / 500))`; TH ≤ 11 → `step × 10`, altrimenti `step × 5`. Sotto 150 il valore è in un riquadro rosso (solo evidenza).
- **Capitale**: 1 punto per attacco; −10 per ogni weekend con 0 attacchi (solo per chi era già nel clan).
- **Giochi**: ≥ 4000 → 35; ≥ 2000 → 20; ≥ 1000 → 0; < 1000 → −10. Barra di avanzamento piena a 4000.
- **Ammonizioni**: automatiche, senza inserimento a mano. Numero = ANF in War + NA in War; ognuna −10. Colonne: «Attacchi non fatti (WAR)» e «Attacco su un nemico errato (WAR)».
- **Totale classifica** = CWL + War + Donazioni + Capitale + Giochi + Ammonizioni.

Sigle (legenda sul sito):

| Sigla | Significato | Nei dati |
|---|---|---|
| ANF | attacco non fatto | `st:"miss"` |
| AE | auto escluso | `st:"red"` (solo CWL) |
| ESC | escluso dal capo | `st:"exc"` (solo CWL) |
| NA | nemico non assegnato | CWL: `st:"wrong"`; War: `na:true` sull'attacco |

Il gioco non espone le direttive: **NA lo segna sempre un admin**, non si rileva in automatico.

Formato dei numeri: 2 decimali per punti stella e totale (CWL, Giornate CWL, War) e per CWL, War e Totale in Classifica; punti % senza decimali. In War la cella mostra «ANF» / «2 ANF», «NA» / «2 NA», «ANF · NA».

Riquadro in alto a destra delle pagine: Classifica → nome del primo in classifica + «player in testa»; CWL → punteggio più alto + «punteggio più alto»; Giochi → «player a 4000 punti»; Ammonizioni → «ammonizioni totali».

## Stagioni e CWL

- Due stagioni visibili: quella in corso e la precedente. Pulsanti «Stagione <Mese>».
- Il 1° del mese, dalle 01:00 ora di Roma, la sincronizzazione archivia il mese finito in `prev` e azzera la stagione in corso. **La Capitale non si azzera.** Si conserva solo l'ultimo mese chiuso (i più vecchi restano nella cronologia git).
- La classifica per i bonus somma la CWL del mese M con i dati del mese M−1. Quindi **la CWL giocata a inizio mese viene scritta nella stagione precedente** (`prev.data.cwl`) finché un admin non preme **Chiudi CWL**; da quel momento la sincronizzazione non la tocca più. Le pagine CWL e Giornate CWL mostrano solo la stagione di riferimento (etichetta verde).
- Il contatore ufficiale delle donazioni si azzera il 1° alle 05:00 UTC, dopo l'archivio.
- Archivio forzato: avvio manuale del workflow con la casella «Archivia subito…» (`FORCE_ARCHIVE=true`).

## Dati (`data/clan.json`)

```
meta      clan, tag, season, updated, don, info, moves, …
players   [{tag, name, th, role, joined, warPref, donations, ex?}]
wars      [{id, label (gg/mm di fine war), opponent, end, atk, th}]
            atk[nome] = [a1, a2]   a = {s, eth, na?} | {st:"miss"} | null (non ancora fatto)
            th[nome]  = TH del player in quella war
            vecchio formato ancora letto: pts[nome], miss[nome]
cwl       {season, days:[{label, e:{nome:{st, s, p, eth}}}]}
capital   [{id, label, att:{nome: n}}]
games     [{id, label, pts:{nome: n}}]
manual    modifiche admin (vedi sotto)
prev      {label, month, archivedAt, cwlClosed, data:{…stessa forma…}}
_state    stato interno della sincronizzazione (mese, base dei giochi)
```

I dati sono indicizzati per **nome** del player, non per tag: un cambio nome spezza lo storico (miglioria futura: passare ai tag).

## Admin

- Login: confronto con `AUTH`, impronta SHA-256 di `UTENTE:PASSWORD`. Sessione in `sessionStorage` (`mech-admin`). Per cambiarla l'utente calcola l'impronta sul proprio computer e si sostituisce solo il valore di `AUTH`.
- Il sito è statico: il login nasconde i controlli ma non protegge i dati pubblicati; quelli cambiano solo con un commit.
- Le modifiche admin sono sovrapposizioni in `manual`, applicate da `applyManual()` sopra i dati dell'API. Chiavi con separatore `§`: `cwlOv[nome].p`, `cwl`, `watk["idWar§nome§indiceAttacco"]`, `cap`, `games`, `don`, `cols.war` / `cols.cap` (colonne aggiunte a mano).
- Modifiche in sospeso: bordo dorato finché non si preme **Conferma**; **Annulla** torna all'ultima conferma (copia di riferimento in `localStorage`, `mech-base`).
- Le modifiche restano nel browser dell'admin. Per pubblicarle: pagina *Dati e API* → **Copia dati JSON** → incollare tutto in `data/clan.json` → commit. La sincronizzazione conserva `manual`.
- Gli admin modificano solo la stagione in corso; CWL e Giornate CWL finché la CWL non è chiusa.

## Sincronizzazione

- API ufficiale Supercell tramite il proxy RoyaleAPI (`https://cocproxy.royaleapi.dev/v1`); la chiave deve avere l'IP `45.79.218.79`.
- ClashKing (`https://api.clashk.ing`, senza chiave) serve al sito per i membri in tempo reale e allo script per ingressi e uscite. Per donazioni e giochi non è affidabile sui clan che non traccia.
- War: l'elenco delle war passate dell'API non contiene gli attacchi, quindi lo script salva `currentwar` a ogni giro. A war finita gli attacchi mancanti diventano ANF.
- Capitale: l'API dà gli attacchi per membro solo per il weekend in corso o appena finito; lo script non sovrascrive i weekend già salvati.
- Giochi: base registrata dal giorno 22 (obiettivo *Games Champion*), punti = differenza, massimo 4000.
- Variabili: `COC_TOKEN` (segreto), `CLAN_TAG`, `FORCE_ARCHIVE`, `GAMES_START_DAY`, `GAMES_END_DAY`.

## Limiti noti e cose da fare

- **GitHub ritarda il cron.** Previsto ogni 30 minuti, osservato ogni 4–7 ore. Se una war finisce e ne parte subito un'altra tra due giri, gli ultimi attacchi si perdono e restano `null`: è successo con la war del 15/11 del clan di prova (6 attacchi rimasti `null`). Da decidere con Ko: avvio più regolare del workflow e/o chiusura delle war rimaste aperte (recupero da ClashKing oppure correzione a mano dell'admin).
- Le war precedenti all'attivazione della sincronizzazione non hanno il dettaglio degli attacchi: vanno inserite a mano dall'admin.
- Passaggio a MechanicaL ancora da fare (vedi Stato attuale).
- Credenziali admin definitive da impostare.
- Indicizzazione dei player per tag invece che per nome.
