#!/usr/bin/env node
/*
 * Génère les instantanés hors ligne d'Atlas à partir des VRAIES séries OWID.
 *
 * Usage (machine avec accès internet) :
 *   node tools/generate-owid-snapshots.mjs > snapshots.js
 * puis coller le contenu de snapshots.js dans le fichier Atlas, à la place de
 * `const STATIC_SNAPSHOTS = Object.create(null);`.
 *
 * Aucune donnée n'est inventée : le script télécharge les CSV officiels,
 * garde la dernière année disponible par pays, arrondit à 4 chiffres
 * significatifs et convertit les noms de pays OWID vers les noms français
 * utilisés par Atlas (table extraite du fichier HTML lui-même).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = join(dirname(fileURLToPath(import.meta.url)), '..', 'atlas_MOBILE_v45_petitbac_glace_bilingue.html');

// Thèmes phares à embarquer : clé Atlas → URL CSV OWID (grapher)
const THEMES = {
  population: 'https://ourworldindata.org/grapher/population.csv',
  life: 'https://ourworldindata.org/grapher/life-expectancy.csv',
  gdp: 'https://ourworldindata.org/grapher/gdp-per-capita-worldbank.csv',
  co2: 'https://ourworldindata.org/grapher/co-emissions-per-capita.csv',
  internet: 'https://ourworldindata.org/grapher/share-of-individuals-using-the-internet.csv',
  happiness: 'https://ourworldindata.org/grapher/happiness-cantril-ladder.csv',
};

// Table FR → OWID extraite du HTML (ex. 'République dém. du Congo':'Democratic Republic of Congo')
const html = readFileSync(HTML, 'utf-8');
const tableMatch = html.match(/const\s+\w*[Tt]opoToOwid\w*\s*=\s*\{([^}]+)\}/) || html.match(/'République démocratique du Congo':'Democratic Republic of Congo'[^}]*/);
const frToOwid = {};
const pairRe = /'((?:[^'\\]|\\.)+)':'((?:[^'\\]|\\.)+)'/g;
if (tableMatch) for (const m of tableMatch[0].matchAll(pairRe)) frToOwid[m[1]] = m[2];
const owidToFr = Object.fromEntries(Object.entries(frToOwid).map(([fr, en]) => [en, fr]));

const round4 = (v) => {
  if (!Number.isFinite(v)) return null;
  const p = Math.max(0, 4 - Math.ceil(Math.log10(Math.abs(v) || 1)));
  return +v.toFixed(Math.min(p, 6));
};

const NON_COUNTRIES = /World|OECD|income|Europe|Asia|Africa|America|European Union|region|WB\)|WHO\)|UN\)/;

const out = {};
for (const [key, url] of Object.entries(THEMES)) {
  const res = await fetch(url, { headers: { 'User-Agent': 'atlas-snapshot-generator' } });
  if (!res.ok) { console.error(`# ${key}: HTTP ${res.status} — ignoré`); continue; }
  const [header, ...lines] = (await res.text()).trim().split('\n');
  const cols = header.split(',');
  const vi = cols.length - 1; // dernière colonne = valeur (format grapher standard)
  const latest = {};
  for (const line of lines) {
    // parse CSV simple (les noms OWID ne contiennent pas de virgule échappée dans grapher)
    const parts = line.split(',');
    const entity = parts[0], year = +parts[2] || +parts[1], value = +parts[vi];
    if (!entity || NON_COUNTRIES.test(entity) || !Number.isFinite(value)) continue;
    if (!latest[entity] || year > latest[entity].year) latest[entity] = { year, value };
  }
  const values = {};
  let year = 0;
  for (const [entity, row] of Object.entries(latest)) {
    const fr = owidToFr[entity] || entity;
    const v = round4(row.value);
    if (v != null) { values[fr] = v; year = Math.max(year, row.year); }
  }
  out[key] = { year, values };
  console.error(`# ${key}: ${Object.keys(values).length} pays, année max ${year}`);
}

console.log('/* Généré par tools/generate-owid-snapshots.mjs — vraies données OWID, dernière année par pays. */');
console.log('const STATIC_SNAPSHOTS = ' + JSON.stringify(out, null, 0).replace(/^{/, 'Object.assign(Object.create(null), {').replace(/}$/, '});'));
