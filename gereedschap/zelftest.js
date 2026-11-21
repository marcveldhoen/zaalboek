/* zelftest.js — controleert of het Aanwijzer-gereedschap nog goed werkt.

   Draaien:   node gereedschap/zelftest.js

   Raakt niets echts: de test maakt een tijdelijke kopie van dit project
   (git clone), met een nep-GitHub (een lokale, lege opslagplaats) en
   nepgegevens. Daarop start hij een eigen testserver en loopt hij alle
   gevallen na van tekst en opmaak zonder Claude, en van live zetten zonder
   Claude, inclusief de controles die iets moeten tegenhouden. Daarna wordt
   alles weer weggegooid.

   Elke regel is ✓ (goed) of ✗ (fout). Bij een ✗ eindigt de test met een
   foutcode. Draai hem na elke wijziging aan gereedschap/. Claude Code is
   hiervoor niet nodig. */

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { spawn, execFileSync } = require("child_process");

const PROJECT = path.resolve(__dirname, "..");
const TMP     = fs.mkdtempSync(path.join(os.tmpdir(), "zaalboek-zelftest-"));
const REMOTE  = path.join(TMP, "github.git");
const WERK    = path.join(TMP, "zaalboek");
const POORT   = 8790 + Math.floor(Math.random() * 100);
const ADRES   = `http://127.0.0.1:${POORT}`;

let fouten = 0;
function check(goed, wat, uitleg) {
  console.log(`${goed ? "✓" : "✗"} ${wat}${!goed && uitleg ? "  (" + uitleg + ")" : ""}`);
  if (!goed) fouten++;
}
const git = (...args) => execFileSync("git", args, { cwd: WERK, encoding: "utf8" });
const lees = r => fs.readFileSync(path.join(WERK, r), "utf8");
const schrijf = (r, t) => fs.writeFileSync(path.join(WERK, r), t);
const wacht = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- de kopie opzetten ---------------- */

function opzetten() {
  execFileSync("git", ["init", "--bare", "-q", "-b", "main", REMOTE]);
  execFileSync("git", ["clone", "-q", PROJECT, WERK]);
  git("config", "user.name", "Zelftest");
  git("config", "user.email", "zelftest@voorbeeld.invalid");
  git("remote", "set-url", "origin", REMOTE);
  // het gereedschap zoals het nú op schijf staat (ook als het nog niet gecommit is)
  for (const f of fs.readdirSync(path.join(PROJECT, "gereedschap"))) {
    if (f.endsWith(".js")) fs.copyFileSync(path.join(PROJECT, "gereedschap", f), path.join(WERK, "gereedschap", f));
  }
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "-m", "zelftest: beginstand");
  git("push", "-q", "-u", "origin", "main");
  // nepgegevens: de server maakt dan geen kopie van de echte gegevens
  fs.mkdirSync(path.join(WERK, "testgegevens"), { recursive: true });
  schrijf("testgegevens/zaalboek.json", JSON.stringify({
    gebouwen: [{ id: "g1", naam: "Proefgebouw" }],
    zalen: [{ id: "z1", naam: "Proefzaal Zuid", gebouwId: "g1" }],
    verenigingen: [{ id: "v1", naam: "Testkoor Harmonie" }],
    opstellingen: []
  }));
  schrijf("aanwijzingen.json", "[]");
}

function startServer() {
  return new Promise((klaar, fout) => {
    const p = spawn(process.execPath, [path.join(WERK, "gereedschap", "testserver.js")], {
      cwd: WERK, env: Object.assign({}, process.env, { PORT: String(POORT) }), stdio: ["ignore", "pipe", "pipe"]
    });
    let uit = "";
    p.stdout.on("data", d => { uit += d; if (uit.includes("Testserver draait")) klaar(p); });
    p.stderr.on("data", d => { uit += d; });
    p.on("exit", c => fout(new Error("testserver stopte: " + uit)));
    setTimeout(() => fout(new Error("testserver start niet: " + uit)), 8000);
  });
}

const post = async (pad, lijf) => (await fetch(ADRES + pad, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lijf || {}) })).json();
const get = async pad => (await fetch(ADRES + pad)).json();

let volgnummer = 0;
function aanwijzing(bericht, onderdeel) {
  const a = {
    nummer: ++volgnummer, tijd: new Date().toISOString(), status: "open", scherm: "overzicht",
    gesprek: [Object.assign({ van: "marc", tekst: "", tijd: new Date().toISOString() }, bericht)],
    onderdeel: Object.assign({ omschrijving: "proef", tag: "button", id: "", klassen: "", tekst: "", data: {}, cssPad: "" }, onderdeel || {}),
    positie: { x: 0, y: 0, breedte: 10, hoogte: 10 }, venster: { breedte: 800, hoogte: 600 }
  };
  if (bericht.tekstwijziging) a.tekstwijziging = bericht.tekstwijziging;
  if (bericht.stijl) a.stijl = bericht.stijl;
  const lijst = JSON.parse(lees("aanwijzingen.json"));
  lijst.push(a);
  schrijf("aanwijzingen.json", JSON.stringify(lijst, null, 2));
  return a;
}
const zoek = n => JSON.parse(lees("aanwijzingen.json")).find(a => a.nummer === n);
const gewijzigd = () => git("status", "--porcelain").split("\n").filter(Boolean);
const remoteLog = () => execFileSync("git", ["--git-dir", REMOTE, "log", "--format=%s", "main"], { encoding: "utf8" });

async function wachtOpTaak() {
  for (let i = 0; i < 100; i++) {
    const t = await get("/taak");
    if (!t.bezig) return t;
    await wacht(100);
  }
  return { uitkomst: "te lang" };
}

/* ---------------- de gevallen ---------------- */

async function testen() {
  const Direct = require(path.join(WERK, "gereedschap", "direct.js"));

  console.log("\n— stijlbestand lezen en aanpassen (los) —");
  check(Direct.zetInRegel("color:red;margin:0", { color: "var(--accent)" }) === "color:var(--accent);margin:0", "bestaande waarde vervangen, op één regel");
  check(Direct.zetInRegel("margin:0", { color: "var(--accent)" }) === "margin:0;color:var(--accent)", "nieuwe waarde toevoegen, op één regel");
  check(Direct.zetInRegel("\n  margin:0;\n  padding:1px;\n", { "font-style": "italic" }) === "\n  margin:0;\n  padding:1px;\n  font-style:italic;\n", "nieuwe waarde toevoegen, onder elkaar");
  check(Direct.zetInRegel("background-color:red", { color: "var(--wit)" }) === "background-color:red;color:var(--wit)", "color niet verwarren met background-color");
  check(Direct.zetInRegel("color:red /* x */", { color: "var(--wit)" }) === null, "regel met commentaar niet aanraken");
  const regels = Direct.cssRegels("/* a{b} */\n.x{a:1}\n@media (max-width:9px){.x{a:2}}\n.y,.z{a:3}");
  check(regels.length === 2 && regels[0].selector === ".x" && regels[1].selector === ".y,.z", "regels binnen @media en commentaar overslaan");

  console.log("\n— tekst direct in de code —");
  const t1 = aanwijzing({ tekstwijziging: { oud: "Opstellingen afdrukken", nieuw: 'Map "printen" & meer' } }, { id: "startAfdrukken", cssPad: "#startAfdrukken" });
  let uit = await post("/direct", { nummer: t1.nummer });
  check(uit.direct === true, "tekst op één plek wordt direct aangepast", uit.reden);
  check(lees("js/schermen/start.js").includes('Map "printen" &amp; meer</button>'), "nieuwe tekst veilig in de HTML van de JavaScript");
  check(zoek(t1.nummer).status === "verwerkt" && zoek(t1.nummer).direct === true, "aanwijzing staat op verwerkt, direct");
  try { execFileSync(process.execPath, ["--check", path.join(WERK, "js/schermen/start.js")]); check(true, "JavaScript nog geldig"); }
  catch (e) { check(false, "JavaScript nog geldig"); }

  const t2 = aanwijzing({ tekstwijziging: { oud: "Zalen inrichten", nieuw: "Zalen" } });
  uit = await post("/direct", { nummer: t2.nummer });
  check(uit.direct === false && /plekken/.test(uit.reden), "tekst op meer plekken: naar Verwerk", uit.reden);
  check(zoek(t2.nummer).status === "open" && /Niet direct/.test(zoek(t2.nummer).gesprek.slice(-1)[0].tekst), "reden staat in het gesprek");

  const t3 = aanwijzing({ tekstwijziging: { oud: "Proefzaal Zuid", nieuw: "Iets" } });
  uit = await post("/direct", { nummer: t3.nummer });
  check(uit.direct === false && /gegevens/.test(uit.reden), "tekst uit de gegevens: niet in de code", uit.reden);

  const t4 = aanwijzing({ tekst: "maak hem groter", tekstwijziging: { oud: "Beheer", nieuw: "Beheren" } });
  uit = await post("/direct", { nummer: t4.nummer });
  check(uit.direct === false && zoek(t4.nummer).status === "open", "met een wens in woorden erbij: niet direct (Claude)");

  console.log("\n— opmaak direct in het stijlbestand —");
  const cssVoor = lees("css/interface.css");
  const s1 = aanwijzing({ stijl: { bereik: "dit", selector: "#startAfdrukken", eigenschappen: { color: "var(--accent)", "font-weight": "600" } } },
                        { id: "startAfdrukken", klassen: "menuknop omlijnd", cssPad: "#startAfdrukken" });
  uit = await post("/direct", { nummer: s1.nummer });
  check(uit.direct === true && uit.stijl === true, "opmaak voor één onderdeel met eigen naam", uit.reden);
  let r = Direct.cssRegels(lees("css/interface.css")).filter(x => x.selector === "#startAfdrukken");
  check(r.length === 1, "precies één regel voor #startAfdrukken");
  const css1 = lees("css/interface.css");
  check(r.length === 1 && /color:var\(--accent\)/.test(css1.slice(r[0].bodyBegin, r[0].bodyEind)), "met de juiste kleur");
  const plekS1 = css1.indexOf("#startAfdrukken{");
  check(plekS1 > css1.indexOf(".menuknop .ico{") && plekS1 < css1.indexOf(".menu .status{"), "nieuwe regel staat bij de regels van .menuknop, niet onderaan");

  const s2 = aanwijzing({ stijl: { bereik: "alle", selector: "button.menuknop", eigenschappen: { "font-style": "italic" } } });
  uit = await post("/direct", { nummer: s2.nummer });
  check(uit.direct === true, "opmaak voor alle gelijke onderdelen (klasse)", uit.reden);
  r = Direct.cssRegels(lees("css/interface.css")).filter(x => x.selector === ".menuknop");
  check(r.length === 1 && /font-style:italic/.test(lees("css/interface.css").slice(r[0].bodyBegin, r[0].bodyEind)), "in de bestaande regel .menuknop gezet, geen tweede regel");

  const s3 = aanwijzing({ stijl: { bereik: "alle", selector: "button.menuknop", eigenschappen: { "font-style": "normal" } } });
  uit = await post("/direct", { nummer: s3.nummer });
  const body3 = (() => { const x = Direct.cssRegels(lees("css/interface.css")).find(y => y.selector === ".menuknop"); return lees("css/interface.css").slice(x.bodyBegin, x.bodyEind); })();
  check(uit.direct === true && /font-style:normal/.test(body3) && !/italic/.test(body3), "nog een keer: waarde vervangen, niet gestapeld");

  const s4 = aanwijzing({ stijl: { bereik: "dit", selector: "#startAfdrukken", eigenschappen: { color: "#ff0000" } } });
  uit = await post("/direct", { nummer: s4.nummer });
  check(uit.direct === false && /kleur/.test(uit.reden), "vrije kleur: naar Verwerk (stijlbestand gebruikt alleen variabelen)", uit.reden);

  const s5 = aanwijzing({ stijl: { bereik: "dit", selector: "#startlijst > div:nth-of-type(1) > h1", eigenschappen: { color: "var(--accent)" } } });
  uit = await post("/direct", { nummer: s5.nummer });
  check(uit.direct === false && /eigen naam/.test(uit.reden), "onderdeel zonder vaste naam: naar Verwerk", uit.reden);

  const s6 = aanwijzing({ stijl: { bereik: "dit", selector: "#startAfdrukken", eigenschappen: { color: "var(--bestaatniet)" } } });
  uit = await post("/direct", { nummer: s6.nummer });
  check(uit.direct === false, "onbekende kleurvariabele: niet direct");

  console.log("\n— terug na een mislukte controle in de browser —");
  const s7 = aanwijzing({ stijl: { bereik: "alle", selector: "button.menuknop", eigenschappen: { "text-decoration": "underline" } } });
  const cssVoorS7 = lees("css/interface.css");
  await post("/direct", { nummer: s7.nummer });
  uit = await post("/direct/terug", { nummer: s7.nummer, reden: "proef" });
  check(uit.teruggezet === true && lees("css/interface.css") === cssVoorS7, "stijlbestand precies terug zoals ervoor");
  check(zoek(s7.nummer).status === "open" && !zoek(s7.nummer).direct, "aanwijzing weer open voor Verwerk");
  check(!zoek(s7.nummer).gesprek.some(b => /^Direct aangepast/.test(b.tekst)) && /^Niet direct/.test(zoek(s7.nummer).gesprek.slice(-1)[0].tekst),
        "in het gesprek alleen ‘Niet direct aangepast’, niet ook ‘Direct aangepast’");

  console.log("\n— live zetten zonder Claude —");
  // de open aanwijzingen die niet direct konden, laten we voor deze proef weg
  schrijf("aanwijzingen.json", JSON.stringify(JSON.parse(lees("aanwijzingen.json")).filter(a => a.status === "verwerkt"), null, 2));
  let v = await get("/goedkeuren/voorstel");
  check(v.direct === true, "voorstel: kan zonder Claude", v.reden);
  check(v.direct && v.regels.length === 4 && v.titel.endsWith("(via het Aanwijzer-tooltje)"), "met omschrijving van alle vier de wijzigingen");
  await post("/goedkeuren");
  let t = await wachtOpTaak();
  check(t.uitkomst === "gelukt", "commit en push gelukt", t.samenvatting);
  check(remoteLog().split("\n")[0].endsWith("(via het Aanwijzer-tooltje)"), "commit staat op de nep-GitHub");
  check(gewijzigd().length === 0, "niets meer gewijzigd");
  check(JSON.parse(lees("aanwijzingen.json")).length === 0, "verwerkte aanwijzingen gewist");
  check(!fs.existsSync(path.join(WERK, "testgegevens/direct.json")), "boekhouding gewist");

  console.log("\n— wat het live zetten zonder Claude moet tegenhouden —");
  // 1. ook iets anders aan hetzelfde bestand veranderd
  schrijf("aanwijzingen.json", "[]");
  // zoals Marc hem op het scherm ziet: met "&", terwijl de code "&amp;" heeft
  const k1 = aanwijzing({ tekstwijziging: { oud: 'Map "printen" & meer', nieuw: "Afdrukken" } });
  uit = await post("/direct", { nummer: k1.nummer });
  check(uit.direct === true && lees("js/schermen/start.js").includes(">Afdrukken</button>"), "tekst met & (in de code &amp;) direct aangepast", uit.reden);
  schrijf("js/schermen/start.js", lees("js/schermen/start.js") + "\n// met de hand erbij\n");
  v = await get("/goedkeuren/voorstel");
  check(v.direct === false && /andere manier/.test(v.reden), "bestand ook met de hand veranderd: via Claude", v.reden);
  uit = await post("/direct/terug", { nummer: k1.nummer });
  check(uit.teruggezet === false, "terug weigert als het bestand intussen veranderd is");
  await post("/terugdraaien");
  check(gewijzigd().length === 0, "(opruimen) terugdraaien zet alles opzij");

  // De knop heeft nu weer de tekst uit de vorige commit; de proeven hieronder
  // veranderen steeds die tekst (die maar op één plek staat).
  const knop = () => { const m = /id="startAfdrukken"[^\n]*<\/svg>([^<]*)<\/button>/.exec(lees("js/schermen/start.js"));
                       return m ? m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : null; };
  async function directeKnoptekst(nieuw) {
    schrijf("aanwijzingen.json", "[]");
    const a = aanwijzing({ tekstwijziging: { oud: knop(), nieuw } });
    const uit = await post("/direct", { nummer: a.nummer });
    if (!uit.direct) throw new Error("voorbereiding mislukt: " + uit.reden);
    return a;
  }
  async function goedkeurenEnWacht() {
    const antwoord = await fetch(ADRES + "/goedkeuren", { method: "POST" });
    if (antwoord.status !== 202) return { uitkomst: "niet gestart (" + antwoord.status + ")", samenvatting: (await antwoord.json()).message };
    return wachtOpTaak();
  }

  // 2. een wijziging van Claude ertussen
  await directeKnoptekst("Afdrukken twee");
  const lijst = JSON.parse(lees("aanwijzingen.json"));
  lijst.push({ nummer: 99, status: "verwerkt", gesprek: [{ van: "claude", tekst: "iets" }], onderdeel: { cssPad: "" } });
  schrijf("aanwijzingen.json", JSON.stringify(lijst));
  v = await get("/goedkeuren/voorstel");
  check(v.direct === false && /Claude/.test(v.reden), "een wijziging van Claude ertussen: via Claude", v.reden);
  await post("/terugdraaien");
  check(gewijzigd().length === 0, "(opruimen) teruggedraaid");

  // 3. een naam uit de gegevens in de nieuwe tekst
  await directeKnoptekst("Afdrukken voor Testkoor Harmonie");
  let voorLog = remoteLog();
  const voorKop = git("rev-parse", "HEAD");
  t = await goedkeurenEnWacht();
  check(t.uitkomst === "mislukt" && /Testkoor Harmonie/.test(t.samenvatting), "naam uit de gegevens: niet live gezet", t.samenvatting);
  check(remoteLog() === voorLog && git("rev-parse", "HEAD") === voorKop, "niets gecommit of gepusht");
  await post("/terugdraaien");

  // 4. iets dat op een sleutel lijkt
  // nep, en in stukjes, zodat er in de code zelf niets staat dat op een sleutel lijkt
  await directeKnoptekst(["github", "pat", "11NEPNEPNEP"].join("_"));
  t = await goedkeurenEnWacht();
  check(t.uitkomst === "mislukt" && /sleutel/.test(t.samenvatting), "iets dat op een sleutel lijkt: niet live gezet", t.samenvatting);
  check(git("rev-parse", "HEAD") === voorKop, "niets gecommit");
  await post("/terugdraaien");

  // 5. pushen mislukt: commit blijft staan, later alsnog pushen
  await directeKnoptekst("Afdrukken!");
  git("remote", "set-url", "origin", path.join(TMP, "bestaat-niet.git"));
  t = await goedkeurenEnWacht();
  check(t.uitkomst === "mislukt" && /pushen/.test(t.samenvatting), "pushen mislukt: dat wordt gemeld", t.samenvatting);
  check(gewijzigd().length === 0 && git("log", "-1", "--format=%s").includes("Afdrukken!"), "de commit staat wel op deze computer");
  git("remote", "set-url", "origin", REMOTE);
  v = await get("/goedkeuren/voorstel");
  check(v.direct === true && v.alleenPush === true, "daarna: alleen nog pushen, zonder Claude", v.reden);
  t = await goedkeurenEnWacht();
  check(t.uitkomst === "gelukt" && remoteLog().split("\n")[0].includes("Afdrukken!"), "alsnog gepusht", t.samenvatting);

  // 6. Terugdraaien zet een direct aangepaste tekst terug en de aanwijzing weer open
  const k6 = await directeKnoptekst("Nog eens");
  await post("/terugdraaien");
  check(knop() === "Afdrukken!" && zoek(k6.nummer).status === "open", "Terugdraaien: tekst terug, aanwijzing weer open");
  check(!fs.existsSync(path.join(WERK, "testgegevens/direct.json")), "Terugdraaien: boekhouding gewist");
}

/* ---------------- uitvoeren ---------------- */

(async () => {
  let server;
  try {
    opzetten();
    server = await startServer();
    await testen();
  } catch (e) {
    check(false, "de test zelf liep vast", e.message);
  } finally {
    if (server) server.kill();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  console.log(fouten ? `\n${fouten} fout(en).` : "\nAlles goed.");
  process.exit(fouten ? 1 : 0);
})();
