#!/usr/bin/env node
// Sync dei dati del clan MECHANICAL dall'API ufficiale di Clash of Clans → data/clan.json
// Uso:  COC_TOKEN=... CLAN_TAG=#XXXXXX node scripts/sync.mjs
//       node scripts/sync.mjs --reset-season "Dicembre 2026"   (azzera tutto tranne Capitale e ammonizioni archiviate)
// Nessuna dipendenza: richiede Node 20+ (fetch integrato).

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(process.env.DATA_FILE || 'data/clan.json');
const BASE = (process.env.COC_API_BASE || 'https://cocproxy.royaleapi.dev/v1').replace(/\/$/, '');
const TOKEN = process.env.COC_TOKEN;
const CLAN = (process.env.CLAN_TAG || '#CYG089CY').trim().toUpperCase(); // TEST ViCtOrY SqUaD (MechanicaL: #2Q9YC0UCJ)
const GAMES_START = +(process.env.GAMES_START_DAY || 22); // i Giochi del clan di solito vanno dal 22 al 28
const GAMES_END = +(process.env.GAMES_END_DAY || 28);
const today = new Date();
const iso = d => d.toISOString().slice(0, 10);

// --- regole di punteggio: identiche a quelle del sito ---
const mult = d => (d >= 2 ? 1.5 : d === 1 ? 1.25 : d === 0 ? 1 : d === -1 ? 0.75 : 0.5);
const starPts = (myTh, enemyTh, stars) => stars * mult(enemyTh - myTh);

async function api(p) {
  const r = await fetch(BASE + p, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } });
  if (r.status === 404) return null;
  if (r.status === 403) {
    const body = await r.text();
    if (p.includes('war')) { console.warn(`403 su ${p}: il registro war del clan è privato?`); return null; }
    throw new Error(`403 su ${p}: token non valido o IP non autorizzato (usa 45.79.218.79 con il proxy RoyaleAPI). ${body}`);
  }
  if (!r.ok) throw new Error(`${r.status} su ${p}: ${await r.text()}`);
  return r.json();
}
const enc = t => encodeURIComponent(t);
const cocDate = s => new Date(s.replace(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d).*/, '$1-$2-$3T$4:$5:$6Z'));

// --- Stagione precedente: il 1° del mese dalle 01:00 (ora di Roma) si archivia il mese appena finito ---
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const monthLabel = (y, m) => MESI[m - 1].replace(/^./, c => c.toUpperCase()) + ' ' + y;
function romeNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, ym: `${p.year}-${p.month}` };
}
async function archiveIfDue(D) {
  const rn = romeNow();
  D._state ??= {};
  if (!D._state.seasonMonth) { D._state.seasonMonth = rn.ym; D.meta.season = monthLabel(rn.y, rn.m); return false; }
  const force = process.env.FORCE_ARCHIVE === 'true';
  const due = force || (D._state.seasonMonth !== rn.ym && (rn.d > 1 || rn.h >= 1));
  if (!due) return false;
  const [py, pm] = D._state.seasonMonth.split('-').map(Number);
  // donazioni del mese chiuso: contatore ufficiale di stagione dei membri (lo storico delle 01:00 avviene prima dell'azzeramento di Supercell)
  const by = Object.fromEntries((D.players || []).filter(p => p.tag && typeof p.donations === 'number').map(p => [p.tag, p.donations]));
  const don = { src: 'archive', from: `${py}-${String(pm).padStart(2, '0')}-01`, total: Object.values(by).reduce((a, b) => a + b, 0), by };
  const players = JSON.parse(JSON.stringify(D.players || []));
  D.prev = {
    label: monthLabel(py, pm), month: D._state.seasonMonth,
    archivedAt: new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }),
    cwlClosed: null,
    data: JSON.parse(JSON.stringify({ players, wars: D.wars, cwl: { season: rn.ym, days: [] }, capital: D.capital, games: D.games, warnings: D.warnings, manual: D.manual || {}, don })), // copia indipendente
  };
  // nuova stagione: si riparte da zero, tranne la Capitale (regolamento)
  const nx = rn.m === 12 ? `${rn.y + 1}-01` : `${rn.y}-${String(rn.m + 1).padStart(2, '0')}`;
  Object.assign(D, { wars: [], cwl: { season: nx, days: [] }, games: [{ id: rn.ym, label: `Giochi di ${MESI[rn.m - 1]}`, pts: {} }], warnings: [], manual: { cap: D.manual?.cap || {}, cols: { cap: D.manual?.cols?.cap || [] }, lbl: { cap: D.manual?.lbl?.cap || {} } } });
  (D.players || []).forEach(p => { p.donations = 0; });
  D._state.seasonMonth = rn.ym;
  D.meta.season = monthLabel(rn.y, rn.m);
  console.log(`Archiviata la stagione ${D.prev.label}; nuova stagione ${D.meta.season}`);
  return true;
}

async function load() {
  try { return JSON.parse(await fs.readFile(OUT, 'utf8')); }
  catch { return { meta: {}, players: [], wars: [], cwl: { season: '', days: [] }, capital: [], games: [], warnings: [], _state: {} }; }
}

async function main() {
  const D = await load();
  D._state ??= {};
  D.warnings ??= [];

  const reset = process.argv.indexOf('--reset-season');
  if (reset > -1) {
    const season = process.argv[reset + 1] || '';
    D._state.archive ??= [];
    D._state.archive.push({ season: D.meta.season, wars: D.wars.length, warnings: D.warnings.length, closed: iso(today) });
    Object.assign(D, { wars: [], cwl: { season, days: [] }, games: [], warnings: [], manual: { cap: D.manual?.cap || {} } });
    D.meta.season = season;
    await save(D);
    console.log(`Stagione azzerata → ${season}. La Capitale resta.`);
    return;
  }

  if (!TOKEN) throw new Error('Serve la variabile COC_TOKEN (chiave API di developer.clashofclans.com)');

  // 0) Storico mensile nella Stagione precedente
  D.meta ??= {};
  if (await archiveIfDue(D)) await save(D); // salvato subito, anche se il resto della sincronizzazione fallisce

  // 1) Membri + profili (TH, red flag, Giochi del clan)
  const clan = await api(`/clans/${enc(CLAN)}`);
  const members = (await api(`/clans/${enc(CLAN)}/members?limit=50`)).items;
  const prev = Object.fromEntries((D.players || []).map(p => [p.tag || p.name, p]));
  const profiles = {};
  for (const m of members) profiles[m.tag] = await api(`/players/${enc(m.tag)}`);

  D.players = members.map(m => {
    const old = prev[m.tag] || prev[m.name] || {};
    const pr = profiles[m.tag] || {};
    return {
      tag: m.tag, name: m.name, th: m.townHallLevel, role: m.role,
      joined: old.joined || iso(today), lastCwl: old.lastCwl || '',
      warPref: pr.warPreference || 'in',
      donations: m.donations,
    };
  });
  const byTag = Object.fromEntries(D.players.map(p => [p.tag, p]));

  // 1b) Donazioni: contatore ufficiale di stagione (/clans/{tag}/members), già letto sopra
  D.meta.don = { src: 'live', asOf: new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }), total: D.players.reduce((a, p) => a + (p.donations || 0), 0), by: Object.fromEntries(D.players.map(p => [p.tag, p.donations])) };

  // 2) War classica: salviamo uno snapshot finché la war non finisce (il registro war non ha il dettaglio attacchi)
  const war = await api(`/clans/${enc(CLAN)}/currentwar`);
  if (war && ['inWar', 'warEnded'].includes(war.state)) {
    const id = war.preparationStartTime;
    const enemy = Object.fromEntries(war.opponent.members.map(o => [o.tag, o]));
    const endD = cocDate(war.endTime);
    // colonna = giorno di fine war, come nel registro del gioco. Per ogni player: i 2 attacchi {s: stelle, eth: TH avversario};
    // a fine war gli attacchi mancanti diventano {st:'miss'} (ANF). NA (nemico non assegnato) lo spunta l'admin sul sito.
    const w = { id, label: endD.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit' }), opponent: war.opponent.name, end: iso(endD), result: '', atk: {}, th: {} };
    const n = war.attacksPerMember || 2;
    for (const m of war.clan.members) {
      const atk = [...(m.attacks || [])].sort((a, b) => a.order - b.order).slice(0, n)
        .map(x => ({ s: x.stars, eth: enemy[x.defenderTag]?.townhallLevel ?? m.townhallLevel }));
      while (atk.length < n) atk.push(war.state === 'warEnded' ? { st: 'miss' } : null);
      w.atk[m.name] = atk;
      w.th[m.name] = m.townhallLevel;
    }
    if (war.state === 'warEnded') w.result = war.clan.stars > war.opponent.stars || (war.clan.stars === war.opponent.stars && war.clan.destructionPercentage > war.opponent.destructionPercentage) ? 'vinta' : 'persa';
    const i = D.wars.findIndex(x => x.id === id);
    if (i > -1) D.wars[i] = w; else D.wars.push(w);
  }

  // 3) C.W.L.: 7 giornate
  const group = await api(`/clans/${enc(CLAN)}/currentwar/leaguegroup`);
  if (group && group.rounds && group.season === romeNow().ym) { // solo la CWL del mese in corso
    const days = [];
    for (const [i, round] of group.rounds.entries()) {
      const day = { label: `G${i + 1}`, e: {} };
      for (const tag of round.warTags.filter(t => t !== '#0')) {
        const lw = await api(`/clanwarleagues/wars/${enc(tag)}`);
        if (!lw) continue;
        const us = lw.clan.tag === CLAN ? lw.clan : lw.opponent.tag === CLAN ? lw.opponent : null;
        if (!us) continue;
        const them = us === lw.clan ? lw.opponent : lw.clan;
        const enemy = Object.fromEntries(them.members.map(o => [o.tag, o]));
        for (const m of us.members) {
          const a = (m.attacks || [])[0];
          if (a) {
            const d = enemy[a.defenderTag];
            day.e[m.name] = { st: 'ok', s: a.stars, p: a.destructionPercentage, eth: d?.townhallLevel ?? m.townhallLevel };
          } else if (lw.state === 'warEnded') day.e[m.name] = { st: 'miss' };
          if (byTag[m.tag]) byTag[m.tag].lastCwl = group.season;
        }
        if (lw.state !== 'preparation') for (const p of D.players) if (!day.e[p.name] && Object.keys(day.e).length) day.e[p.name] = { st: p.warPref === 'out' ? 'red' : 'exc' };
      }
      if (Object.keys(day.e).length) days.push(day);
    }
    // la CWL del mese M conta per la stagione M-1 (archiviata il 1° alle 01:00)
    const tgt = D.prev && D.prev.data?.cwl?.season === group.season ? D.prev : null;
    if (!tgt) console.warn(`CWL ${group.season}: nessuna stagione precedente a cui collegarla, non salvata`);
    else if (tgt.cwlClosed) console.log(`CWL ${group.season} già chiusa dagli admin: non aggiornata`);
    else {
      tgt.data.cwl = { season: group.season, days };
      const known = new Set(tgt.data.players.map(p => p.tag));
      for (const p of D.players) if (!known.has(p.tag) && days.some(d => d.e[p.name] && d.e[p.name].st !== 'red' && d.e[p.name].st !== 'exc')) tgt.data.players.push({ ...p, donations: null });
    }
  }

  // 4) Assalto alla Capitale (non si azzera a fine stagione)
  const raids = await api(`/clans/${enc(CLAN)}/capitalraidseasons?limit=6`);
  if (raids) {
    for (const r of raids.items.slice().reverse()) {
      const start = cocDate(r.startTime);
      const i = D.capital.findIndex(x => x.id === r.startTime);
      if (!r.members || !r.members.length) continue; // weekend vecchio senza elenco membri: si tiene quanto già salvato
      const att = {};
      for (const m of r.members) att[m.name] = m.attacks;
      if (r.state === 'ended') for (const p of D.players) if (att[p.name] == null && new Date(p.joined) <= start) att[p.name] = 0;
      const w = { id: r.startTime, label: `${start.getUTCDate()}/${start.getUTCMonth() + 1}`, att };
      if (i > -1) D.capital[i] = w; else D.capital.push(w);
    }
    D.capital = D.capital.slice(-12);
  }

  // 5) Giochi del clan: differenza dell'obiettivo "Games Champion" tra inizio e fine evento
  const ev = iso(today).slice(0, 7);
  const day = today.getUTCDate();
  D._state.gamesBase ??= {};
  const champ = tag => (profiles[tag]?.achievements || []).find(a => a.name === 'Games Champion')?.value;
  if (day >= GAMES_START && !D._state.gamesBase[ev]) D._state.gamesBase[ev] = Object.fromEntries(D.players.map(p => [p.tag, champ(p.tag)]));
  const base = D._state.gamesBase[ev];
  if (base && day >= GAMES_START) {
    const g = D.games.find(x => x.id === ev) || (D.games.unshift({ id: ev, label: `Giochi ${ev}`, pts: {} }), D.games[0]);
    for (const p of D.players) {
      if (base[p.tag] == null || champ(p.tag) == null) continue;
      if (day <= GAMES_END + 1) g.pts[p.name] = Math.min(4000, champ(p.tag) - base[p.tag]);
    }
  }

  // 6) Storico ingressi/uscite (ClashKing, facoltativo)
  let moves = D.meta.moves || [];
  try {
    const r = await fetch(`https://api.clashk.ing/v2/clan/${enc(CLAN)}/join-leave?limit=12`);
    if (r.ok) moves = (await r.json()).items || moves;
  } catch {}
  const info = { name: clan.name, tag: clan.tag, clanLevel: clan.clanLevel, warLeague: clan.warLeague, warWins: clan.warWins, location: clan.location, publicWarLog: clan.isWarLogPublic, description: clan.description };

  D.meta = { ...D.meta, info, moves, clan: clan.name, tag: CLAN, season: D.meta.season || monthLabel(romeNow().y, romeNow().m), updated: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', source: 'api', demo: [] };
  await save(D);
  console.log(`OK: ${D.players.length} membri, ${D.wars.length} war, ${D.cwl.days.length} giornate CWL, ${D.capital.length} weekend Capitale`);
}

async function save(D) {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(D, null, 1) + '\n');
}

main().catch(e => { console.error(e.message); process.exit(1); });
