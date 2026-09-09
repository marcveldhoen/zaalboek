/* app.js — het startpunt.

   Hier komen de twee helften bij elkaar: opslag.js haalt het document op en
   bewaart het, de schermen laten het zien. Er is nog geen startscherm
   (bouwstap 3); tot die tijd wisselt de knop in de kop tussen het tekenscherm
   en het zaal-inrichtscherm, zodat scherm 6 nu al te proberen is zonder op
   bouwstap 3 te wachten. */

let HuidigScherm = null;   // SchermTekenen of SchermZaal — wie de knoppen in de kop bedient

const HINT_TEKENEN = `Slepen om te verplaatsen &middot; <kbd>R</kbd> draaien &middot; pijltjes verschuiven<br>
  Lege ruimte slepen om de plattegrond te verschuiven`;
const HINT_ZAAL = "Lege ruimte slepen om de plattegrond te verschuiven.";

/* ---------------- de statusregel in de kop ---------------- */

function toonStatus(status) {
  const regel = document.getElementById("status");
  regel.classList.remove("warn");

  if (status.staat === "laden")   { regel.textContent = "gegevens ophalen..."; return; }
  if (status.staat === "wachten") { regel.textContent = "nog niet bewaard"; return; }
  if (status.staat === "bezig")   { regel.textContent = "bewaren..."; return; }

  if (status.staat === "bewaard") {
    const t = status.tijd;
    const tweecijfers = n => String(n).padStart(2, "0");
    regel.textContent = `bewaard om ${tweecijfers(t.getHours())}:${tweecijfers(t.getMinutes())}`;
    return;
  }

  if (status.staat === "fout") {
    // een botsing of een verlopen sleutel vraagt om ingrijpen, de rest niet
    if (status.fout.soort === "botsing") {
      toonMelding("Ondertussen gewijzigd", status.fout.tekst +
        " Ververs de pagina om verder te werken met de nieuwste versie.");
      return;
    }
    if (status.fout.soort === "sleutel") {
      vraagSleutel(status.fout.tekst);
      return;
    }
    regel.classList.add("warn");
    regel.textContent = "niet bewaard - " + status.fout.tekst;
  }
}

/* ---------------- schermen wisselen ---------------- */

function naarTekenen(opstelling) {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermTekenen;
  document.getElementById("wisselScherm").textContent = "Zalen inrichten";
  document.getElementById("hint").innerHTML = HINT_TEKENEN;
  SchermTekenen.open(opstelling || Model.document.opstellingen[0]);
}

function naarZalenInrichten() {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermZaal;
  document.getElementById("wisselScherm").textContent = "Terug naar tekenen";
  document.getElementById("hint").innerHTML = HINT_ZAAL;
  document.getElementById("ongedaan").disabled = true;   // dit scherm heeft nog geen ongedaan-maken
  SchermZaal.open();
}

/* ---------------- de twee vensters ---------------- */

function vraagSleutel(melding) {
  document.getElementById("sleutelmelding").textContent = melding;
  document.getElementById("sleutelvenster").hidden = false;
  document.getElementById("sleutelveld").focus();
}

function toonMelding(titel, tekst) {
  document.getElementById("meldingtitel").textContent = titel;
  document.getElementById("meldingtekst").textContent = tekst;
  document.getElementById("meldingvenster").hidden = false;
}

/* ---------------- starten ---------------- */

async function openen() {
  document.getElementById("sleutelvenster").hidden = true;
  toonStatus({ staat: "laden" });

  let doc;
  try {
    doc = await Opslag.laden();
  } catch (fout) {
    if (fout.soort === "sleutel") { vraagSleutel(fout.tekst); return; }
    toonMelding("De gegevens konden niet opgehaald worden", fout.tekst);
    return;
  }

  /* Bij een pas aangemaakt bestand staat er alleen { "versie": 1 } in. Dan
     wordt de voorbeeldzaal gebruikt en meteen bewaard, zodat er iets is om mee
     te beginnen. */
  const wasLeeg = Model.isLeeg(doc);
  Model.gebruik(wasLeeg ? Model.voorbeeld : doc);

  /* Wat er bij GitHub staat, opnieuw opschrijven zoals wij het zouden bewaren.
     Zonder dit zou een verschil in spaties bij elk openen een schrijfactie
     opleveren. Was het bestand leeg, dan moet er juist wel bewaard worden. */
  Opslag.laatstBewaard = wasLeeg ? null : Model.alsTekst();

  SchermTekenen.opWijziging = () => Opslag.bewaarStraks(Model.alsTekst());
  SchermZaal.opWijziging    = () => Opslag.bewaarStraks(Model.alsTekst());
  naarTekenen();
}

function start() {
  Opslag.meld = toonStatus;

  document.getElementById("sleutelbewaren").onclick = () => {
    const veld = document.getElementById("sleutelveld");
    if (!veld.value.trim()) return;
    Opslag.bewaarSleutel(veld.value);
    veld.value = "";
    openen();
  };
  document.getElementById("sleutelveld").onkeydown = ev => {
    if (ev.key === "Enter") document.getElementById("sleutelbewaren").click();
  };
  document.getElementById("meldingverversen").onclick = () => location.reload();

  document.getElementById("ongedaan").onclick = () => {
    if (HuidigScherm && HuidigScherm.ongedaanMaken) HuidigScherm.ongedaanMaken();
  };
  document.getElementById("wisselScherm").onclick = () => {
    if (HuidigScherm === SchermZaal) naarTekenen(); else naarZalenInrichten();
  };

  if (!Opslag.heeftSleutel()) {
    vraagSleutel("Plak hier de sleutel die je bij GitHub hebt aangemaakt.");
    return;
  }
  openen();
}

start();
