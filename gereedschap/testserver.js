/* testserver.js — de lokale testopstelling in één server.

   Starten:   node gereedschap/testserver.js
   Openen:    http://localhost:8745/test-lokaal.html

   Wat hij doet:
   - serveert de bestanden van de app, zoals een gewone webserver;
   - /contents  doet alsof het de GitHub-opslag is, maar werkt op een KOPIE
                van de gegevens in testgegevens/zaalboek.json. Het echte bestand
                in ~/Documents/zaalboek-gegevens wordt alleen gelezen (één keer,
                om de kopie te maken) en nooit beschreven;
   - /aanwijzingen  bewaart de aanwijzingen uit het Aanwijzer-tooltje in
                aanwijzingen.json in de projectmap.

   Alleen ingebouwde onderdelen van Node, geen extra pakketten. testgegevens/
   en aanwijzingen.json staan in .gitignore: ze kunnen echte zaalnamen
   bevatten. */

const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const crypto = require("crypto");

const POORT        = Number(process.env.PORT) || 8745;
const PROJECTMAP   = path.resolve(__dirname, "..");
const ECHT_BESTAND = path.join(os.homedir(), "Documents", "zaalboek-gegevens", "zaalboek.json");
const KOPIEMAP     = path.join(PROJECTMAP, "testgegevens");
const KOPIE        = path.join(KOPIEMAP, "zaalboek.json");
const AANWIJZINGEN = path.join(PROJECTMAP, "aanwijzingen.json");

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
  if (fs.existsSync(KOPIE)) return;
  fs.mkdirSync(KOPIEMAP, { recursive: true });
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

async function aanwijzingen(verzoek, antwoord) {
  if (verzoek.method === "GET") {
    const tekst = fs.existsSync(AANWIJZINGEN) ? fs.readFileSync(AANWIJZINGEN, "utf8") : "[]";
    return stuur(antwoord, 200, tekst);
  }

  if (verzoek.method === "POST") {
    let lijst;
    try { lijst = JSON.parse(await leesLijf(verzoek)); }
    catch (e) { return stuur(antwoord, 422, { message: "Onleesbaar verzoek" }); }
    if (!Array.isArray(lijst)) return stuur(antwoord, 422, { message: "Verwacht een lijst" });

    fs.writeFileSync(AANWIJZINGEN, JSON.stringify(lijst, null, 2) + "\n");
    return stuur(antwoord, 200, { bewaard: lijst.length });
  }

  stuur(antwoord, 405, { message: "Niet toegestaan" });
}

/* ---------------- gewone bestanden ---------------- */

function bestand(verzoek, antwoord, pad) {
  if (pad === "/") pad = "/test-lokaal.html";
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
    if (pad === "/contents")     return await opslag(verzoek, antwoord);
    if (pad === "/aanwijzingen") return await aanwijzingen(verzoek, antwoord);
    bestand(verzoek, antwoord, pad);
  } catch (e) {
    console.error(e);
    stuur(antwoord, 500, { message: "Fout in de testserver" });
  }
}).listen(POORT, "127.0.0.1", () => {
  console.log(`Testserver draait: http://localhost:${POORT}/test-lokaal.html`);
});
