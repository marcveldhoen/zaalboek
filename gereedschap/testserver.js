/* testserver.js — de lokale testopstelling in één server.

   Starten:   node gereedschap/testserver.js
              (of via Spotlight: "Zaalboek testen")
   Openen:    http://localhost:8745/test-lokaal.html

   Wat hij doet:
   - serveert de bestanden van de app, zoals een gewone webserver;
   - /test-lokaal.html  maakt hij zelf uit index.html: dezelfde pagina, maar
                met de opslag omgeleid naar /contents vóórdat de app start, en
                met het Aanwijzer-tooltje erbij. Zo loopt de testpagina nooit
                achter op index.html;
   - /contents  doet alsof het de GitHub-opslag is, maar werkt op een KOPIE
                van de gegevens in testgegevens/zaalboek.json. Het echte bestand
                in ~/Documents/zaalboek-gegevens wordt alleen gelezen (één keer,
                om de kopie te maken) en nooit beschreven;
   - /aanwijzingen  bewaart de aanwijzingen uit het tooltje in
                aanwijzingen.json in de projectmap;
   - /verwerk, /goedkeuren, /terugdraaien, /taak, /wijzigingen: de knoppen
                van het tooltje. Verwerken en goedkeuren laten Claude Code op
                de achtergrond het werk doen (het programma `claude`);
                terugdraaien zet de wijzigingen opzij met `git stash`, zodat
                ze altijd nog terug te halen zijn.

   Alleen ingebouwde onderdelen van Node, geen extra pakketten. testgegevens/
   en aanwijzingen.json staan in .gitignore: ze kunnen echte zaalnamen
   bevatten. */

const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const crypto = require("crypto");
const { spawn, execFile } = require("child_process");

const POORT        = Number(process.env.PORT) || 8745;
const PROJECTMAP   = path.resolve(__dirname, "..");
const ECHT_BESTAND = path.join(os.homedir(), "Documents", "zaalboek-gegevens", "zaalboek.json");
const KOPIEMAP     = path.join(PROJECTMAP, "testgegevens");
const KOPIE        = path.join(KOPIEMAP, "zaalboek.json");
const AANWIJZINGEN = path.join(PROJECTMAP, "aanwijzingen.json");
const INDEX        = path.join(PROJECTMAP, "index.html");
const TAAKLOG      = path.join(KOPIEMAP, "laatste-taak.log");
const MAX_DUUR     = 20 * 60 * 1000;          // een taak van Claude mag 20 minuten duren

const SOORTEN = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".ico":  "image/x-icon"
};

/* De kopie maken als die er nog niet is. Wil je met verse gegevens testen,
   gooi dan de map testgegevens/ weg en start de server opnieuw. */
function zorgVoorKopie() {
  fs.mkdirSync(KOPIEMAP, { recursive: true });
  if (fs.existsSync(KOPIE)) return;
  if (fs.existsSync(ECHT_BESTAND)) {
    fs.copyFileSync(ECHT_BESTAND, KOPIE);
    console.log("Kopie gemaakt van de gegevens in testgegevens/zaalboek.json");
  } else {
    fs.writeFileSync(KOPIE, "{}\n");
    console.log("Geen gegevens gevonden; testgegevens/zaalboek.json begint leeg");
  }
}

function shaVan(tekst) {
  return crypto.createHash("sha1").update(tekst).digest("hex");
}

function stuur(antwoord, status, inhoud, soort) {
  antwoord.writeHead(status, {
    "Content-Type": soort || "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  antwoord.end(typeof inhoud === "string" || Buffer.isBuffer(inhoud) ? inhoud : JSON.stringify(inhoud));
}

function leesLijf(verzoek) {
  return new Promise((klaar, fout) => {
    const stukken = [];
    verzoek.on("data", s => stukken.push(s));
    verzoek.on("end", () => klaar(Buffer.concat(stukken).toString("utf8")));
    verzoek.on("error", fout);
  });
}

/* ---------------- de testpagina, gemaakt uit index.html ----------------
   De omleiding staat direct na opslag.js en vóór app.js: zuiver synchrone
   scriptvolgorde, dus de app praat vanaf het begin alleen met /contents.
   Kan de omleiding niet worden ingevoegd, dan geen pagina: liever niets dan
   een testpagina die stiekem de echte opslag gebruikt. */

const OPSLAGSCRIPT = '<script src="js/opslag.js"></script>';

function testpagina() {
  let html = fs.readFileSync(INDEX, "utf8");
  if (!html.includes(OPSLAGSCRIPT) || !html.includes("</body>")) return null;
  html = html.replace(OPSLAGSCRIPT, OPSLAGSCRIPT + `
<script>
  /* Testpagina, gemaakt door gereedschap/testserver.js: de opslag gaat naar
     een kopie van de gegevens, nooit naar de echte opslagplaats. */
  Opslag.adres = function() { return "/contents"; };
  Opslag.heeftSleutel = function() { return true; };
  Opslag.kop = function() { return { "Content-Type": "application/json" }; };
</script>`);
  html = html.replace("</body>", '<script src="gereedschap/aanwijzer.js"></script>\n</body>');
  html = html.replace(/<title>[^<]*<\/title>/, "<title>Zaalboek — testomgeving</title>");
  return html;
}

/* ---------------- /contents: de nep-GitHub-opslag ---------------- */

async function opslag(verzoek, antwoord) {
  const tekst = fs.readFileSync(KOPIE, "utf8");
  const sha = shaVan(tekst);

  if (verzoek.method === "GET") {
    return stuur(antwoord, 200, {
      sha,
      content: Buffer.from(tekst, "utf8").toString("base64")
    });
  }

  if (verzoek.method === "PUT") {
    let lijf;
    try { lijf = JSON.parse(await leesLijf(verzoek)); }
    catch (e) { return stuur(antwoord, 422, { message: "Onleesbaar verzoek" }); }

    // net als GitHub: alleen bewaren als je de nieuwste versie had
    if (lijf.sha !== sha) return stuur(antwoord, 409, { message: "Botsing" });

    const nieuw = Buffer.from(String(lijf.content || ""), "base64").toString("utf8");
    fs.writeFileSync(KOPIE, nieuw);
    return stuur(antwoord, 200, { content: { sha: shaVan(nieuw) } });
  }

  stuur(antwoord, 405, { message: "Niet toegestaan" });
}

/* ---------------- /aanwijzingen ---------------- */

function leesAanwijzingen() {
  try { return JSON.parse(fs.readFileSync(AANWIJZINGEN, "utf8")); } catch (e) { return []; }
}

function schrijfAanwijzingen(lijst) {
  fs.writeFileSync(AANWIJZINGEN, JSON.stringify(lijst, null, 2) + "\n");
}

async function aanwijzingen(verzoek, antwoord) {
  if (verzoek.method === "GET") return stuur(antwoord, 200, leesAanwijzingen());

  if (verzoek.method === "POST") {
    // terwijl Claude bezig is, is aanwijzingen.json van Claude
    if (taak.bezig) return stuur(antwoord, 423, { message: "Claude is bezig" });
    let lijst;
    try { lijst = JSON.parse(await leesLijf(verzoek)); }
    catch (e) { return stuur(antwoord, 422, { message: "Onleesbaar verzoek" }); }
    if (!Array.isArray(lijst)) return stuur(antwoord, 422, { message: "Verwacht een lijst" });

    schrijfAanwijzingen(lijst);
    return stuur(antwoord, 200, { bewaard: lijst.length });
  }

  stuur(antwoord, 405, { message: "Niet toegestaan" });
}

/* ---------------- git ---------------- */

function git(...args) {
  return new Promise(klaar => {
    execFile("git", args, { cwd: PROJECTMAP }, (fout, uit, err) =>
      klaar({ gelukt: !fout, uit: String(uit || "").trim(), fout: String(err || (fout && fout.message) || "").trim() }));
  });
}

/* Welke bestanden zijn gewijzigd maar nog niet live, en staat er nog iets
   klaar dat niet gepusht is? */
async function stand() {
  // niet git() gebruiken: dat haalt spaties weg, en die horen hier bij de regel
  const status = await new Promise(klaar =>
    execFile("git", ["status", "--porcelain"], { cwd: PROJECTMAP }, (f, uit) => klaar(String(uit || ""))));
  const bestanden = status.split("\n").filter(r => r.trim()).map(r => r.slice(3));
  const voor = await git("rev-list", "--count", "@{u}..HEAD");
  return { bestanden, nietGepusht: Number(voor.uit) || 0 };
}

/* ---------------- taken voor Claude Code ---------------- */

const taak = { soort: null, bezig: false, begin: null, einde: null, uitkomst: null, samenvatting: "" };

function claudeOmgeving() {
  const extra = [path.join(os.homedir(), ".local", "bin"), "/opt/homebrew/bin", "/usr/local/bin"];
  return Object.assign({}, process.env, { PATH: extra.concat(process.env.PATH || "").join(":") });
}

function startClaude(soort, opdracht, gereedschap, naAfloop) {
  Object.assign(taak, { soort, bezig: true, begin: Date.now(), einde: null, uitkomst: null, samenvatting: "" });
  let uit = "";

  const proces = spawn("claude", [
    "-p", opdracht,
    "--permission-mode", "acceptEdits",
    "--allowedTools", gereedschap
  ], { cwd: PROJECTMAP, env: claudeOmgeving(), stdio: ["ignore", "pipe", "pipe"] });

  proces.stdout.on("data", d => { uit += d; });
  proces.stderr.on("data", d => { uit += d; });

  const wekker = setTimeout(() => { uit += "\n(Gestopt: duurde langer dan 20 minuten.)"; proces.kill(); }, MAX_DUUR);

  const klaar = async (code) => {
    clearTimeout(wekker);
    if (!taak.bezig) return;
    fs.writeFileSync(TAAKLOG, `${new Date().toISOString()} ${soort}, code ${code}\n\n${uit}`);
    let uitkomst = code === 0 ? "gelukt" : "mislukt";
    try { uitkomst = (await naAfloop(code, uit)) || uitkomst; } catch (e) { uitkomst = "mislukt"; }
    let samenvatting = uit.trim().slice(-2000);
    if (/authenticat|not logged in|\/login/i.test(uit)) {
      uitkomst = "mislukt";
      samenvatting = "Claude Code is niet (meer) aangemeld. Open Terminal, typ claude, meld je aan met /login en probeer het daarna opnieuw.\n\n" + samenvatting;
    }
    Object.assign(taak, { bezig: false, einde: Date.now(), uitkomst, samenvatting });
  };
  proces.on("close", klaar);
  proces.on("error", e => {
    uit += `\nClaude Code kon niet gestart worden (${e.message}). Is het programma 'claude' geïnstalleerd?`;
    klaar(-1);
  });
}

const OPDRACHT_VERWERKEN = `Je bent gestart door de knop "Verwerk" in het Aanwijzer-tooltje van de lokale testserver. Marc kan nu niets terugzeggen.

Verwerk de aanwijzingen in aanwijzingen.json met status "open", volgens de werkwijze in CLAUDE.md, met deze afwijkingen:
- Commit en push NIET. Marc bekijkt de wijziging eerst in de testpagina en keurt hem daarna goed met een eigen knop.
- Test niet in de browser; controleer JavaScript wel met "node --check".
- Wijzig alleen de code van de app (js/, css/, index.html). Nooit zaalboek.json, testgegevens/, gereedschap/ of .md-bestanden.

Elke aanwijzing heeft "tekst" (wat Marc wil, in zijn woorden) en/of "stijl" (opmaak die Marc als voorbeeld al op het scherm zag). Maak een "stijl" definitief op de juiste plek in de css: bij bereik "dit" alleen voor dat onderdeel, bij bereik "alle" voor de klasse in "selector". Een kleur als var(--accent) is een bestaande CSS-variabele: gebruik die. Bedenk ook of de wijziging het printblad (css/blad.css) mag raken; meestal niet.

Werk daarna aanwijzingen.json bij, en verander daarin verder niets:
- uitgevoerd: zet "status" op "verwerkt" en zet in "antwoord" in één korte Nederlandse zin wat je hebt gedaan;
- niet duidelijk wat Marc bedoelt, of te groot of riskant: verander niets aan de code, zet "status" op "vraag" en zet in "vraag" in één korte zin wat je wilt weten.

Eindig met een samenvatting van hooguit drie zinnen in gewoon Nederlands.`;

const OPDRACHT_GOEDKEUREN = `Je bent gestart door de knop "Goedkeuren en live zetten" in het Aanwijzer-tooltje van de lokale testserver. Marc heeft de huidige wijzigingen in de testpagina bekeken en goedgekeurd. Hij kan nu niets terugzeggen.

Zet ze live volgens de afspraken in CLAUDE.md:
1. Bekijk git status en git diff. Controleer dat er geen persoonsgegevens, gegevensbestanden (zaalboek.json, testgegevens/, aanwijzingen.json), .md-bestanden, sleutels, tokens of wachtwoorden meegaan.
2. Is alles in orde: voeg de gewijzigde codebestanden toe met git add (nooit git add -f, nooit git add -A of .), controleer git diff --staged, commit met een korte, duidelijke Nederlandse omschrijving en daaronder de regel "Co-Authored-By: Claude <noreply@anthropic.com>", en push naar main.
3. Twijfel je ergens over: commit en push niet.

Eindig met één zin in gewoon Nederlands: wat je gecommit hebt, of waarom niet.`;

async function verwerk(verzoek, antwoord) {
  if (verzoek.method !== "POST") return stuur(antwoord, 405, { message: "Niet toegestaan" });
  if (taak.bezig) return stuur(antwoord, 409, { message: "Claude is al bezig" });
  if (!leesAanwijzingen().some(a => a.status === "open")) return stuur(antwoord, 422, { message: "Geen open aanwijzingen" });

  startClaude("verwerken", OPDRACHT_VERWERKEN, "Read,Edit,Write,Glob,Grep,Bash(node --check:*)", async (code) => {
    if (code !== 0) return "mislukt";
    const over = leesAanwijzingen().filter(a => a.status === "open").length;
    return over ? "deels" : "gelukt";
  });
  stuur(antwoord, 202, taak);
}

async function goedkeuren(verzoek, antwoord) {
  if (verzoek.method !== "POST") return stuur(antwoord, 405, { message: "Niet toegestaan" });
  if (taak.bezig) return stuur(antwoord, 409, { message: "Claude is al bezig" });
  const nu = await stand();
  if (!nu.bestanden.length && !nu.nietGepusht) return stuur(antwoord, 422, { message: "Er is niets om live te zetten" });

  const kopVoor = (await git("rev-parse", "HEAD")).uit;
  startClaude("goedkeuren", OPDRACHT_GOEDKEUREN,
    "Read,Bash(git status:*),Bash(git diff:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*),Bash(git log:*)",
    async () => {
      const kopNa = (await git("rev-parse", "HEAD")).uit;
      const na = await stand();
      if (kopNa === kopVoor || na.nietGepusht) return "mislukt";
      // live gezet: de verwerkte aanwijzingen zijn klaar
      schrijfAanwijzingen(leesAanwijzingen().filter(a => a.status !== "verwerkt"));
      return "gelukt";
    });
  stuur(antwoord, 202, taak);
}

/* Terugdraaien zonder Claude: git stash zet alle niet-gecommitte wijzigingen
   (ook nieuwe bestanden) opzij. Niets gaat verloren: 'git stash list' toont
   ze, 'git stash pop' haalt ze terug. */
async function terugdraaien(verzoek, antwoord) {
  if (verzoek.method !== "POST") return stuur(antwoord, 405, { message: "Niet toegestaan" });
  if (taak.bezig) return stuur(antwoord, 409, { message: "Claude is bezig" });
  const nu = await stand();
  if (!nu.bestanden.length) return stuur(antwoord, 422, { message: "Er zijn geen wijzigingen" });

  const tijd = new Date().toLocaleString("nl-NL");
  const uit = await git("stash", "push", "--include-untracked", "-m", `Aanwijzer: teruggedraaid op ${tijd}`);
  if (!uit.gelukt) return stuur(antwoord, 500, { message: uit.fout });

  // de verwerkte aanwijzingen weer open zetten, zodat Marc ze kan aanpassen
  schrijfAanwijzingen(leesAanwijzingen().map(a => {
    if (a.status !== "verwerkt") return a;
    const b = Object.assign({}, a, { status: "open" });
    delete b.antwoord;
    return b;
  }));
  stuur(antwoord, 200, { teruggedraaid: nu.bestanden });
}

/* ---------------- gewone bestanden ---------------- */

function bestand(verzoek, antwoord, pad) {
  const volledig = path.join(PROJECTMAP, decodeURIComponent(pad));

  // nooit buiten de projectmap, en de kopie van de gegevens niet als bestand
  if (!volledig.startsWith(PROJECTMAP + path.sep) || volledig.startsWith(KOPIEMAP)) {
    return stuur(antwoord, 403, "Niet toegestaan", "text/plain; charset=utf-8");
  }

  fs.readFile(volledig, (fout, inhoud) => {
    if (fout) return stuur(antwoord, 404, "Niet gevonden", "text/plain; charset=utf-8");
    stuur(antwoord, 200, inhoud, SOORTEN[path.extname(volledig).toLowerCase()] || "application/octet-stream");
  });
}

/* ---------------- de server ---------------- */

zorgVoorKopie();

http.createServer(async (verzoek, antwoord) => {
  const pad = new URL(verzoek.url, "http://localhost").pathname;
  try {
    if (pad === "/" || pad === "/index.html") {
      // op deze server altijd de testpagina, nooit de pagina met echte opslag
      antwoord.writeHead(302, { Location: "/test-lokaal.html" });
      return antwoord.end();
    }
    if (pad === "/test-lokaal.html") {
      const html = testpagina();
      if (!html) return stuur(antwoord, 500, "De testpagina kon niet uit index.html gemaakt worden.", "text/plain; charset=utf-8");
      return stuur(antwoord, 200, html, SOORTEN[".html"]);
    }
    if (pad === "/contents")     return await opslag(verzoek, antwoord);
    if (pad === "/aanwijzingen") return await aanwijzingen(verzoek, antwoord);
    if (pad === "/verwerk")      return await verwerk(verzoek, antwoord);
    if (pad === "/goedkeuren")   return await goedkeuren(verzoek, antwoord);
    if (pad === "/terugdraaien") return await terugdraaien(verzoek, antwoord);
    if (pad === "/taak")         return stuur(antwoord, 200, taak);
    if (pad === "/wijzigingen")  return stuur(antwoord, 200, await stand());
    bestand(verzoek, antwoord, pad);
  } catch (e) {
    console.error(e);
    stuur(antwoord, 500, { message: "Fout in de testserver" });
  }
}).listen(POORT, "127.0.0.1", () => {
  console.log(`Testserver draait: http://localhost:${POORT}/test-lokaal.html`);
});
