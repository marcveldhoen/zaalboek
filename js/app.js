/* app.js — het startpunt.

   Hier komen de twee helften bij elkaar: opslag.js haalt het document op en
   bewaart het, de schermen laten het zien. */

let HuidigScherm = null;   // SchermStart, SchermTekenen, SchermZaal of SchermAfdrukken — wie de knoppen in de kop bedient

const HINT_TEKENEN = `Slepen om te verplaatsen &middot; <kbd>R</kbd> draaien &middot; pijltjes verschuiven<br>
  Lege ruimte slepen om de plattegrond te verschuiven`;
const HINT_ZAAL = "Lege ruimte slepen om de plattegrond te verschuiven.";

/* ---------------- de statusregel in de kop ----------------
   Drie uiterlijke toestanden, elk met pictogram én tekst, zodat ze ook
   zonder kleur (of voor een kleurenblinde koster) uit elkaar vallen:
   bewaard (vinkje), bezig (draaiend icoon — dekt laden/wachten/bezig) en
   fout (waarschuwing, met een eigen pictogram voor een verlopen sleutel). */
const STATUS_ICON = {
  bewaard: '<path d="M3.5 8.5l3 3 6-7"/>',
  bezig:   '<path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13 3v3h-3"/>',
  fout:    '<path d="M8 2.5l6 10.5H2z"/><path d="M8 7v3"/><path d="M8 11.8v.2"/>'
};

function pictogram(naam) {
  return `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">${STATUS_ICON[naam]}</svg>`;
}

function toonStatus(status) {
  const regel = document.getElementById("status");

  if (status.staat === "laden")   { regel.dataset.state = "bezig"; regel.innerHTML = pictogram("bezig") + "<span>gegevens ophalen...</span>"; return; }
  if (status.staat === "wachten") { regel.dataset.state = "bezig"; regel.innerHTML = pictogram("bezig") + "<span>nog niet bewaard</span>"; return; }
  if (status.staat === "bezig")   { regel.dataset.state = "bezig"; regel.innerHTML = pictogram("bezig") + "<span>bewaren...</span>"; return; }

  if (status.staat === "bewaard") {
    const t = status.tijd;
    const tweecijfers = n => String(n).padStart(2, "0");
    regel.dataset.state = "bewaard";
    regel.innerHTML = pictogram("bewaard") +
      `<span>bewaard om ${tweecijfers(t.getHours())}:${tweecijfers(t.getMinutes())}</span>`;
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
    regel.dataset.state = "fout";
    regel.innerHTML = pictogram("fout") + `<span>niet bewaard - ${status.fout.tekst}</span>`;
  }
}

/* ---------------- schermen wisselen ---------------- */

/* Scherm 1 (het overzicht) en scherm 4 (afdrukken) hebben geen plattegrond en
   geen gereedschap- of eigenschappenpaneel; de andere twee schermen gebruiken
   juist precies dat. Hier staat op één plek welke delen van `main` bij welk
   scherm horen. */
function toonLayout(scherm) {
  const isStart = scherm === "start";
  const isAfdrukken = scherm === "afdrukken";
  const zonderPlattegrond = isStart || isAfdrukken;

  document.getElementById("gereedschap").hidden = zonderPlattegrond;
  document.querySelector(".stage").hidden = zonderPlattegrond;
  document.getElementById("paneelRechts").hidden = zonderPlattegrond;
  document.getElementById("startscherm").hidden = !isStart;
  document.getElementById("afdrukscherm").hidden = !isAfdrukken;
  document.getElementById("ongedaan").hidden = zonderPlattegrond;
  document.getElementById("hulpKnop").hidden = zonderPlattegrond;
  document.getElementById("afdrukKnop").hidden = scherm !== "tekenen";
  if (zonderPlattegrond) toonHulp(false);
}

function naarStart() {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermStart;
  toonLayout("start");
  document.getElementById("kruimel").textContent = "";
  document.getElementById("wisselScherm").textContent = "Zalen inrichten";
  SchermStart.open();
}

function naarTekenen(opstelling) {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermTekenen;
  toonLayout("tekenen");

  const zaal = Model.zaal(opstelling.zaalId);
  const gebouw = Model.gebouw(zaal.gebouwId);
  const vereniging = opstelling.verenigingId && Model.vereniging(opstelling.verenigingId);
  document.getElementById("kruimel").textContent =
    `${gebouw.naam} / ${zaal.naam}` + (vereniging ? ` — ${vereniging.naam}` : "");

  document.getElementById("wisselScherm").textContent = "Terug naar overzicht";
  document.getElementById("hint").innerHTML = HINT_TEKENEN;
  SchermTekenen.open(opstelling);
}

function naarAfdrukken(opstelling) {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermAfdrukken;
  toonLayout("afdrukken");

  const zaal = Model.zaal(opstelling.zaalId);
  const gebouw = Model.gebouw(zaal.gebouwId);
  document.getElementById("kruimel").textContent = `${gebouw.naam} / ${zaal.naam} — afdrukken`;
  document.getElementById("wisselScherm").textContent = "Terug naar tekenen";
  SchermAfdrukken.open(opstelling);
}

function naarZalenInrichten() {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermZaal;
  toonLayout("zaal");
  document.getElementById("kruimel").textContent = "Zalen inrichten";
  document.getElementById("wisselScherm").textContent = "Terug naar overzicht";
  document.getElementById("hint").innerHTML = HINT_ZAAL;
  document.getElementById("ongedaan").disabled = !SchermZaal.ongedaanStapel.length;
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

/* ---------------- het hulpkaartje ---------------- */

function toonHulp(open) {
  document.getElementById("hulpkaartje").hidden = !open;
  document.getElementById("hulpKnop").setAttribute("aria-expanded", String(open));
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

  SchermStart.opWijziging   = () => Opslag.bewaarStraks(Model.alsTekst());
  SchermTekenen.opWijziging = () => Opslag.bewaarStraks(Model.alsTekst());
  SchermZaal.opWijziging    = () => Opslag.bewaarStraks(Model.alsTekst());
  naarStart();
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
    if (HuidigScherm === SchermStart) naarZalenInrichten();
    else if (HuidigScherm === SchermAfdrukken) naarTekenen(SchermAfdrukken.opstelling);
    else naarStart();
  };
  document.getElementById("afdrukKnop").onclick = () => {
    if (HuidigScherm === SchermTekenen) naarAfdrukken(SchermTekenen.opstelling);
  };
  document.getElementById("wordmark").onclick = () => naarStart();

  const hulpKnop = document.getElementById("hulpKnop");
  const hulpkaartje = document.getElementById("hulpkaartje");
  hulpKnop.onclick = () => toonHulp(hulpkaartje.hidden);
  document.addEventListener("click", ev => {
    if (!hulpkaartje.hidden && !hulpkaartje.contains(ev.target) && !hulpKnop.contains(ev.target)) toonHulp(false);
  });
  document.addEventListener("keydown", ev => {
    if (ev.key === "Escape" && !hulpkaartje.hidden) toonHulp(false);
  });

  if (!Opslag.heeftSleutel()) {
    vraagSleutel("Plak hier de sleutel die je bij GitHub hebt aangemaakt.");
    return;
  }
  openen();
}

start();
