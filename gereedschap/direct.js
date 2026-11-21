/* direct.js — wat het Aanwijzer-tooltje zonder Claude doet.

   Een tekst die Marc in de testpagina typt, of opmaak die hij in het venster
   kiest (vet, cursief, onderstreept, een kleur van de app), hoeft niet langs
   Claude: dit bestand zet hem meteen in de code. En als álle wijzigingen die
   klaarstaan zo gemaakt zijn, zet het ze ook zelf live (commit en push),
   met vaste controles. Bij elke twijfel valt het terug op Claude.

   Drie delen:
   1. voerUit()      een aanwijzing direct in de code zetten;
   2. terug()        een directe wijziging weer weghalen (als de controle in
                     de browser laat zien dat de opmaak niet overkwam);
   3. voorstel(), controles() en zetLive()   live zetten zonder Claude.

   De boekhouding (testgegevens/direct.json) onthoudt per bestand hoe het
   eruitzag na de laatste directe wijziging. Is een bestand daarna door iets
   anders veranderd (Claude, of met de hand), dan klopt dat niet meer en gaat
   het live zetten via Claude. Zo gaat er zonder Claude nooit iets live wat
   het tooltje niet zelf precies zo heeft gedaan.

   Alleen ingebouwde onderdelen van Node. Wordt gebruikt door testserver.js;
   getest met gereedschap/zelftest.js. */

const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");

let MAP, KOPIE, BOEK;

function init(instellingen) {
  MAP   = instellingen.projectmap;
  KOPIE = instellingen.kopie;
  BOEK  = path.join(path.dirname(KOPIE), "direct.json");
}

const MERK = "(via het Aanwijzer-tooltje)";      // achter elke commit zonder Claude
const shaVan = tekst => crypto.createHash("sha1").update(tekst).digest("hex");
const vol = r => path.join(MAP, r);
const lees = r => fs.readFileSync(vol(r), "utf8");

function git(...args) {
  return new Promise(klaar => {
    execFile("git", args, { cwd: MAP, maxBuffer: 20 * 1024 * 1024 }, (fout, uit, err) =>
      klaar({ gelukt: !fout, uit: String(uit || ""), fout: String(err || (fout && fout.message) || "").trim() }));
  });
}

function controleerJs(r) {
  return new Promise(klaar => execFile(process.execPath, ["--check", vol(r)], fout => klaar(!fout)));
}

/* ======================= boekhouding ======================= */

function leesBoek() {
  try { return JSON.parse(fs.readFileSync(BOEK, "utf8")); }
  catch (e) { return { bestanden: {}, terug: {} }; }
}
function schrijfBoek(boek) { fs.writeFileSync(BOEK, JSON.stringify(boek, null, 2) + "\n"); }
function wisBoek() { try { fs.unlinkSync(BOEK); } catch (e) {} }

async function inhoudInHead(r) {
  const uit = await git("show", "HEAD:" + r);
  return uit.gelukt ? uit.uit : null;
}

/* Bevat dit bestand alleen directe wijzigingen (of geen)? */
async function alleenDirect(r, inhoud, boek) {
  const b = boek.bestanden[r];
  if (b) return b.sha !== null && b.sha === shaVan(inhoud);
  return (await inhoudInHead(r)) === inhoud;
}

/* ======================= 1a. tekst in de code ======================= */

function codebestanden() {
  const uit = ["index.html"];
  const loop = map => fs.readdirSync(vol(map), { withFileTypes: true }).forEach(d => {
    const r = map + "/" + d.name;
    if (d.isDirectory()) loop(r);
    else if (d.name.endsWith(".js")) uit.push(r);
  });
  loop("js");
  return uit;
}

/* Waar in een bestand staat "gewone" tekst? JavaScript: binnen '…', "…"
   of `…`, niet in commentaar. HTML: alles buiten <!-- … -->. Geeft
   { begin, eind, soort }, met soort het aanhalingsteken of "html". */
function tekstgebieden(inhoud, isHtml) {
  const gebieden = [];
  if (isHtml) {
    let i = 0;
    while (i < inhoud.length) {
      const c = inhoud.indexOf("<!--", i);
      gebieden.push({ begin: i, eind: c < 0 ? inhoud.length : c, soort: "html" });
      if (c < 0) break;
      const e = inhoud.indexOf("-->", c);
      i = e < 0 ? inhoud.length : e + 3;
    }
    return gebieden;
  }
  let i = 0;
  while (i < inhoud.length) {
    const c = inhoud[i], d = inhoud[i + 1];
    if (c === "/" && d === "/") { const e = inhoud.indexOf("\n", i); i = e < 0 ? inhoud.length : e; continue; }
    if (c === "/" && d === "*") { const e = inhoud.indexOf("*/", i + 2); i = e < 0 ? inhoud.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < inhoud.length && inhoud[j] !== c) {
        if (inhoud[j] === "\\") j++;
        else if (c !== "`" && inhoud[j] === "\n") break;      // geen echte tekst
        j++;
      }
      gebieden.push({ begin: i + 1, eind: j, soort: c });
      i = j + 1;
      continue;
    }
    i++;
  }
  return gebieden;
}

// de nieuwe tekst veilig maken voor de plek waar hij komt te staan
function veilig(tekst, soort) {
  if (soort === "html" || soort === "`") {
    tekst = tekst.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (soort === "`") tekst = tekst.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    return tekst;
  }
  return tekst.replace(/\\/g, "\\\\").replace(new RegExp(soort, "g"), "\\" + soort);
}

/* Alle plekken waar de tekst staat. In HTML (ook HTML binnen JavaScript)
   kan "&" als "&amp;" in de code staan: ook die vorm telt. */
function vindTekst(oud) {
  const plekken = [];
  for (const r of codebestanden()) {
    const inhoud = lees(r);
    for (const g of tekstgebieden(inhoud, r.endsWith(".html"))) {
      const vormen = [oud];
      if (g.soort === "html" || g.soort === "`") {
        const html = oud.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (html !== oud) vormen.push(html);
      }
      for (const vorm of vormen) {
        let i = inhoud.indexOf(vorm, g.begin);
        while (i >= 0 && i + vorm.length <= g.eind) {
          plekken.push({ r, positie: i, lengte: vorm.length, soort: g.soort });
          i = inhoud.indexOf(vorm, i + vorm.length);
        }
      }
    }
  }
  return plekken;
}

/* ======================= 1b. opmaak in de css ======================= */

const CSS = "css/interface.css";

/* De regels van een stijlbestand, alleen op het hoogste niveau: regels
   binnen @media en dergelijke worden overgeslagen (die raakt het tooltje
   niet aan). Geeft { selector, bodyBegin, bodyEind } met bodyEind de plek
   van de sluitende accolade. */
function cssRegels(inhoud) {
  const regels = [];
  let i = 0, start = null;
  const slaOver = (j) => {                 // vanaf een "{" tot en met de bijbehorende "}"
    let diepte = 0;
    for (; j < inhoud.length; j++) {
      if (inhoud[j] === "/" && inhoud[j + 1] === "*") { j = inhoud.indexOf("*/", j + 2); if (j < 0) return inhoud.length; j++; continue; }
      if (inhoud[j] === '"' || inhoud[j] === "'") { const q = inhoud[j]; j++; while (j < inhoud.length && inhoud[j] !== q) { if (inhoud[j] === "\\") j++; j++; } continue; }
      if (inhoud[j] === "{") diepte++;
      if (inhoud[j] === "}") { diepte--; if (diepte === 0) return j; }
    }
    return inhoud.length;
  };
  while (i < inhoud.length) {
    if (inhoud[i] === "/" && inhoud[i + 1] === "*") {
      const e = inhoud.indexOf("*/", i + 2);
      i = e < 0 ? inhoud.length : e + 2;
      continue;
    }
    const c = inhoud[i];
    if (start === null && !/\s/.test(c)) start = i;
    if (c === ";" && start !== null) { start = null; i++; continue; }    // bijvoorbeeld @import …;
    if (c === "{") {
      const selector = inhoud.slice(start, i).replace(/\s+/g, " ").trim();
      const eind = slaOver(i);
      if (!selector.startsWith("@")) regels.push({ selector, bodyBegin: i + 1, bodyEind: eind });
      i = eind + 1;
      start = null;
      continue;
    }
    i++;
  }
  return regels;
}

/* Eigenschappen in een bestaande regel zetten: een bestaande waarde
   vervangen of een nieuwe toevoegen, in de stijl van die regel (op één
   regel, of onder elkaar). Regels met commentaar erin worden niet
   aangeraakt: dan null. */
function zetInRegel(body, eigenschappen) {
  if (body.includes("/*")) return null;
  let nieuw = body;
  for (const [prop, waarde] of Object.entries(eigenschappen)) {
    // bestaande declaratie: "prop:waarde" tot ; of einde
    const re = new RegExp("(^|;|\\s)(" + prop.replace(/-/g, "\\-") + ")\\s*:[^;\\n]*", "i");
    const m = re.exec(nieuw);
    if (m) {
      const begin = m.index + m[1].length;
      nieuw = nieuw.slice(0, begin) + prop + ":" + waarde + nieuw.slice(m.index + m[0].length);
      continue;
    }
    if (nieuw.includes("\n")) {
      // onder elkaar: een nieuwe regel na de laatste declaratie, met dezelfde inspringing
      const laatsteTeken = nieuw.search(/\S\s*$/);
      const insprong = (nieuw.match(/\n([ \t]+)\S/) || [, "  "])[1];
      const voor = nieuw.slice(0, laatsteTeken + 1);
      const na = nieuw.slice(laatsteTeken + 1);
      nieuw = voor + (voor.trim().endsWith(";") ? "" : ";") + "\n" + insprong + prop + ":" + waarde + ";" + na;
    } else {
      const kern = nieuw.trim();
      nieuw = kern + (kern && !kern.endsWith(";") ? ";" : "") + prop + ":" + waarde;
    }
  }
  return nieuw;
}

/* Wat mag er direct in de css? Alleen de eigenschappen van het tooltje,
   met waarden die bij de afspraken van het stijlbestand passen: kleuren
   alleen als bestaande variabele (het bestand zegt zelf: geen losse
   kleurwaarden), en lettergewichten die het lettertype Geist heeft. */
function toegestaneWaarde(prop, waarde, inhoud) {
  if (prop === "font-weight") return /^(400|500|600)$/.test(waarde);
  if (prop === "font-style") return /^(italic|normal)$/.test(waarde);
  if (prop === "text-decoration") return /^(underline|none)$/.test(waarde);
  if (prop === "color" || prop === "background-color") {
    const m = /^var\((--[a-z0-9-]+)\)$/.exec(waarde);
    return !!m && new RegExp("(^|[\\s;{])" + m[1] + "\\s*:").test(inhoud);
  }
  return false;
}

/* Welke selector voor deze stijl, en welke bestaande regels tellen als
   "dezelfde"? Alleen stevige verwijzingen: een eigen naam (#id) voor één
   onderdeel, of klassen voor alle gelijke onderdelen. Een pad als
   "div:nth-of-type(2) > h1" is te broos voor de code: dan null. */
function selectorVoor(stijl, eigenKlassen) {
  if (stijl.bereik === "dit") {
    if (!/^#[A-Za-z][\w-]*$/.test(stijl.selector)) return null;
    // een nieuwe regel komt bij de regels van het onderdeel zelf, of van zijn klassen
    const eigen = (eigenKlassen || "").split(/\s+/).filter(k => /^[A-Za-z_][\w-]*$/.test(k)).map(k => "." + k);
    return { nieuw: stijl.selector, kandidaten: [stijl.selector], verwant: [stijl.selector].concat(eigen) };
  }
  const m = /^([a-z][a-z0-9]*)?((?:\.[A-Za-z_][\w-]*)+)$/.exec(stijl.selector || "");
  if (!m) return null;
  const tag = m[1] || "";
  const klassen = m[2].slice(1).split(".");
  const rijen = [];
  const permuteer = (rest, rij) => rest.length ? rest.forEach((k, i) => permuteer(rest.filter((_, j) => j !== i), rij.concat(k))) : rijen.push(rij);
  permuteer(klassen.slice(0, 4), []);
  const kandidaten = [];
  rijen.forEach(rij => {
    const s = rij.map(k => "." + k).join("");
    kandidaten.push(s);
    if (tag) kandidaten.push(tag + s);
  });
  return { nieuw: klassen.map(k => "." + k).join(""), kandidaten, verwant: klassen.map(k => "." + k) };
}

function zetStijl(inhoud, stijl, klassen) {
  const sel = selectorVoor(stijl, klassen);
  if (!sel) return { reden: "het onderdeel heeft geen eigen naam (id) of klasse om de opmaak aan te hangen" };
  for (const [prop, waarde] of Object.entries(stijl.eigenschappen || {})) {
    if (!toegestaneWaarde(prop, waarde, inhoud)) {
      return { reden: prop.includes("color")
        ? "een vrij gekozen kleur hoort als variabele in het stijlbestand"
        : `de waarde ${waarde} voor ${prop} past niet bij het stijlbestand` };
    }
  }
  const regels = cssRegels(inhoud);
  const zelfde = regels.filter(r => sel.kandidaten.includes(r.selector));
  if (zelfde.length) {
    const r = zelfde[zelfde.length - 1];               // de laatste wint in de cascade
    const body = zetInRegel(inhoud.slice(r.bodyBegin, r.bodyEind), stijl.eigenschappen);
    if (body === null) return { reden: "de stijlregel heeft commentaar erin; dat laat het tooltje aan Claude over" };
    return { inhoud: inhoud.slice(0, r.bodyBegin) + body + inhoud.slice(r.bodyEind), selector: r.selector };
  }
  // nieuwe regel, direct na de laatste regel die erbij hoort (anders onderaan)
  const decl = Object.entries(stijl.eigenschappen).map(([p, w]) => p + ":" + w).join(";");
  const nieuweRegel = sel.nieuw + "{" + decl + "}";
  const past = (r, v) => new RegExp(v.replace(/[.#]/g, "\\$&") + "(?![\\w-])").test(r.selector);
  let verwant = regels.filter(r => past(r, sel.verwant[0]));
  if (!verwant.length) verwant = regels.filter(r => sel.verwant.some(v => past(r, v)));
  if (verwant.length) {
    const na = verwant[verwant.length - 1].bodyEind + 1;
    const regeleinde = inhoud.indexOf("\n", na);
    const plek = regeleinde < 0 ? inhoud.length : regeleinde + 1;
    return { inhoud: inhoud.slice(0, plek) + nieuweRegel + "\n" + inhoud.slice(plek), selector: sel.nieuw };
  }
  return { inhoud: inhoud.replace(/\s*$/, "\n") + nieuweRegel + "\n", selector: sel.nieuw };
}

function beschrijfStijl(eigenschappen) {
  return Object.entries(eigenschappen).map(([p, w]) => {
    if (p === "font-weight") return w === "400" ? "niet vet" : "vet";
    if (p === "font-style") return w === "italic" ? "cursief" : "niet cursief";
    if (p === "text-decoration") return w === "underline" ? "onderstreept" : "niet onderstreept";
    const naam = (/^var\(--(.+)\)$/.exec(w) || [, w])[1];
    return (p === "color" ? "tekstkleur " : "vlakkleur ") + naam;
  }).join(", ");
}

/* ======================= 1. een aanwijzing direct uitvoeren ======================= */

/* Geeft { direct: true, bestanden, stijl } of { direct: false, reden }.
   Eerst alles uitrekenen, dan pas schrijven: het lukt helemaal, of niets
   verandert. */
async function voerUit(a, inGegevens) {
  const l = a.gesprek && a.gesprek[a.gesprek.length - 1];
  const stijl = l && l.stijl && Object.keys(l.stijl.eigenschappen || {}).length ? l.stijl : null;
  if (!l || l.van !== "marc" || l.tekst || (!l.tekstwijziging && !stijl)) {
    return { direct: false, reden: "niet alleen een tekst of opmaak", stil: true };
  }

  const plan = new Map();                         // bestand -> nieuwe inhoud
  const omschrijvingen = [];
  const huidig = r => plan.has(r) ? plan.get(r) : lees(r);

  if (l.tekstwijziging) {
    const { oud, nieuw } = l.tekstwijziging;
    if (inGegevens(oud)) return { direct: false, reden: "de tekst komt uit de gegevens" };
    const plekken = vindTekst(oud);
    if (!plekken.length) return { direct: false, reden: "de tekst staat niet letterlijk in de code (hij wordt misschien samengesteld)" };
    if (plekken.length > 1) return { direct: false, reden: `de tekst staat op ${plekken.length} plekken in de code` };
    const p = plekken[0];
    const inhoud = huidig(p.r);
    plan.set(p.r, inhoud.slice(0, p.positie) + veilig(nieuw, p.soort) + inhoud.slice(p.positie + p.lengte));
    omschrijvingen.push({ r: p.r, tekst: `Tekst ‘${oud}’ → ‘${nieuw}’` });
  }
  if (stijl) {
    const uit = zetStijl(huidig(CSS), stijl, a.onderdeel && a.onderdeel.klassen);
    if (!uit.inhoud) return { direct: false, reden: uit.reden };
    plan.set(CSS, uit.inhoud);
    omschrijvingen.push({ r: CSS, tekst: `Opmaak ${uit.selector}: ${beschrijfStijl(stijl.eigenschappen)}` });
  }

  // schrijven, met de oude inhoud apart voor als het terug moet
  const boek = leesBoek();
  const terug = [];
  for (const [r, nieuw] of plan) {
    const oud = lees(r);
    const zuiver = await alleenDirect(r, oud, boek);
    fs.writeFileSync(vol(r), nieuw);
    terug.push({ r, voor: oud, naSha: shaVan(nieuw), zuiver });
  }
  for (const t of terug) {
    if (t.r.endsWith(".js") && !(await controleerJs(t.r))) {
      terug.forEach(x => fs.writeFileSync(vol(x.r), x.voor));    // liever niets dan kapot
      return { direct: false, reden: "de code werd ongeldig na het aanpassen" };
    }
  }

  for (const t of terug) {
    const b = boek.bestanden[t.r] || { sha: null, omschrijvingen: [] };
    // eenmaal gemengd (er zat ook iets anders aan), blijft gemengd tot het live staat
    b.sha = t.zuiver && (b.sha !== null || !boek.bestanden[t.r]) ? t.naSha : null;
    omschrijvingen.filter(o => o.r === t.r).forEach(o => b.omschrijvingen.push(o.tekst));
    boek.bestanden[t.r] = b;
  }
  boek.terug[a.nummer] = terug.map(t => ({ r: t.r, voor: t.voor, naSha: t.naSha,
    omschrijvingen: omschrijvingen.filter(o => o.r === t.r).map(o => o.tekst) }));
  schrijfBoek(boek);

  return { direct: true, bestanden: [...plan.keys()], stijl: !!stijl, omschrijvingen: omschrijvingen.map(o => o.tekst) };
}

/* ======================= 2. terug ======================= */

/* De directe wijziging van één aanwijzing weghalen. Alleen als het bestand
   sindsdien niet veranderd is; anders false (dan blijft het staan). */
async function terug(nummer) {
  const boek = leesBoek();
  const lijst = boek.terug[nummer];
  if (!lijst) return false;
  if (lijst.some(t => shaVan(lees(t.r)) !== t.naSha)) return false;
  for (const t of lijst) {
    fs.writeFileSync(vol(t.r), t.voor);
    const b = boek.bestanden[t.r];
    if (b) {
      t.omschrijvingen.forEach(o => { const i = b.omschrijvingen.lastIndexOf(o); if (i >= 0) b.omschrijvingen.splice(i, 1); });
      if ((await inhoudInHead(t.r)) === t.voor) delete boek.bestanden[t.r];
      else if (b.sha !== null) b.sha = shaVan(t.voor);
    }
  }
  delete boek.terug[nummer];
  schrijfBoek(boek);
  return true;
}

/* ======================= 3. live zetten zonder Claude ======================= */

async function gewijzigd() {
  const st = await git("status", "--porcelain");
  return st.uit.split("\n").filter(r => r.trim()).map(r => ({ code: r.slice(0, 2), r: r.slice(3) }));
}

async function nietGepusht() {
  const uit = await git("rev-list", "--count", "@{u}..HEAD");
  return Number(uit.uit.trim()) || 0;
}

/* Kan dit zonder Claude? Geeft { direct: true, titel, regels, bestanden }
   of { direct: false, reden }. Alleen als élk gewijzigd bestand precies zo
   is als het tooltje het achterliet, en elke verwerkte aanwijzing direct
   was (niet door Claude). */
async function voorstel(aanwijzingen) {
  const bestanden = await gewijzigd();
  const achter = await nietGepusht();

  if (!bestanden.length) {
    if (!achter) return { direct: false, reden: "er is niets om live te zetten", niets: true };
    const kop = (await git("log", "-1", "--format=%s")).uit.trim();
    if (kop.endsWith(MERK)) return { direct: true, alleenPush: true, titel: kop, regels: [], bestanden: [] };
    return { direct: false, reden: "er staat een commit klaar die niet van het tooltje is" };
  }
  if (achter) return { direct: false, reden: "er staat ook nog een commit klaar die niet gepusht is" };

  if (aanwijzingen.some(a => a.status === "verwerkt" && !a.direct)) {
    return { direct: false, reden: "er zit een wijziging van Claude tussen" };
  }
  const boek = leesBoek();
  const regels = [];
  for (const b of bestanden) {
    if (b.code.includes("?")) return { direct: false, reden: `${b.r} is een nieuw bestand` };
    if (!/^(index\.html|js\/.+\.js|css\/.+\.css)$/.test(b.r)) return { direct: false, reden: `${b.r} is geen code- of stijlbestand` };
    const k = boek.bestanden[b.r];
    if (!k) return { direct: false, reden: `${b.r} is niet door het tooltje veranderd` };
    if (k.sha === null || k.sha !== shaVan(lees(b.r))) return { direct: false, reden: `${b.r} is ook op een andere manier veranderd` };
    regels.push(...k.omschrijvingen);
  }
  if (!regels.length) return { direct: false, reden: "geen omschrijving van de wijzigingen gevonden" };
  const titel = regels.length === 1 ? `${regels[0]} ${MERK}` : `Teksten en opmaak aangepast ${MERK}`;
  return { direct: true, titel, regels, bestanden: bestanden.map(b => b.r) };
}

/* Namen uit de gegevens (zalen, verenigingen, personen, opschriften): die
   horen niet in de openbare code. */
const NAAMVELDEN = /^(naam|korteNaam|opschrift|meervoud|functie|verantwoordelijke|opmerkingen)$/;
function namenUitGegevens() {
  const namen = new Set();
  const loop = (w, sleutel) => {
    if (typeof w === "string") { if (NAAMVELDEN.test(sleutel) && w.trim().length >= 3) namen.add(w.trim()); }
    else if (Array.isArray(w)) w.forEach(x => loop(x, sleutel));
    else if (w && typeof w === "object") Object.entries(w).forEach(([k, v]) => loop(v, k));
  };
  try { loop(JSON.parse(fs.readFileSync(KOPIE, "utf8")), ""); } catch (e) {}
  return [...namen];
}

const tel = (tekst, stuk) => tekst.split(stuk).length - 1;

/* De vaste controles vóór een commit zonder Claude. null = in orde,
   anders de reden. */
async function controles(bestanden) {
  const verschil = await git("diff", "HEAD", "--unified=0", "--", ...bestanden);
  const toegevoegd = verschil.uit.split("\n").filter(r => r.startsWith("+") && !r.startsWith("+++")).join("\n");
  if (/github_pat_|ghp_|gho_|ghs_|sk-[A-Za-z0-9]{20}|-----BEGIN [A-Z ]*PRIVATE KEY|wachtwoord\s*[:=]|password\s*[:=]/i.test(toegevoegd)) {
    return "er staat iets in dat op een sleutel of wachtwoord lijkt";
  }
  for (const r of bestanden) {
    const nu = lees(r);
    const head = (await inhoudInHead(r)) || "";
    for (const naam of namenUitGegevens()) {
      if (tel(nu, naam) > tel(head, naam)) return `‘${naam}’ uit de gegevens zou in de openbare code komen`;
    }
    if (r.endsWith(".js") && !(await controleerJs(r))) return `${r} is geen geldige JavaScript`;
    if (r.endsWith(".css")) {
      const zonder = nu.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"[^"]*"|'[^']*'/g, "");
      if (tel(zonder, "{") !== tel(zonder, "}")) return `${r} heeft niet evenveel { als }`;
    }
  }
  return null;
}

/* Committen en pushen. Lukt de push niet, dan blijft de commit alleen op
   deze computer staan (nooit forceren). */
async function zetLive(v) {
  if (!v.alleenPush) {
    const fout = await controles(v.bestanden);
    if (fout) return { gelukt: false, reden: fout };
    const toe = await git("add", "--", ...v.bestanden);
    if (!toe.gelukt) return { gelukt: false, reden: "git add mislukte: " + toe.fout };
    const args = ["commit", "-m", v.titel];
    if (v.regels.length > 1) args.push("-m", v.regels.map(r => "- " + r).join("\n"));
    const commit = await git(...args);
    if (!commit.gelukt) return { gelukt: false, reden: "commit mislukte: " + commit.fout };
  }
  const push = await git("push", "origin", "HEAD");
  if (!push.gelukt) return { gelukt: false, gecommit: true, reden: "gecommit, maar pushen naar GitHub mislukte: " + push.fout };
  wisBoek();
  return { gelukt: true, titel: v.titel };
}

module.exports = { init, voerUit, terug, voorstel, zetLive, controles, wisBoek, MERK,
                   // voor de zelftest:
                   cssRegels, zetInRegel, zetStijl, tekstgebieden, veilig };
