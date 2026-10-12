/* app.js — het startpunt.

   Hier komen de twee helften bij elkaar: opslag.js haalt het document op en
   bewaart het, de schermen laten het zien. */

let HuidigScherm = null;   // SchermStart, SchermTekenen, SchermZaal, SchermAfdrukken of SchermBeheer — wie de knoppen in de kop bedient

const HINT_TEKENEN = `<kbd>R</kbd> draait &middot; pijltjes verschuiven &middot; lege ruimte
  slepen verschuift de plattegrond`;
const HINT_ZAAL = "Lege ruimte slepen om de plattegrond te verschuiven.";

/* ---------------- de statusregel in de kop ----------------
   Drie uiterlijke toestanden, elk met pictogram én tekst, zodat ze ook
   zonder kleur (of voor een kleurenblinde koster) uit elkaar vallen:
   bewaard (vinkje — dekt ook opgehaald), bezig (draaiend icoon — dekt
   laden/wachten/bezig) en
   fout (waarschuwing, met een eigen pictogram voor een verlopen sleutel). */
const STATUS_ICON = {
  bewaard: '<path d="M3.5 8.5l3 3 6-7"/>',
  bezig:   '<path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13 3v3h-3"/>',
  fout:    '<path d="M8 2.5l6 10.5H2z"/><path d="M8 7v3"/><path d="M8 11.8v.2"/>'
};

function pictogram(naam) {
  return `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">${STATUS_ICON[naam]}</svg>`;
}

/* De statusregel staat in de donkere balk (#status) én onderin de zijbalk
   van het overzicht (elk element met data-status). Beide tonen hetzelfde;
   de laatste stand wordt onthouden, zodat een opnieuw opgebouwde zijbalk
   meteen weer klopt (zie naarStart). */
let laatsteStatus = { state: "", html: "" };

function zetStatus(state, html) {
  laatsteStatus = { state, html };
  document.querySelectorAll("#status, [data-status]").forEach(regel => {
    regel.dataset.state = state;
    regel.innerHTML = html;
  });
}

function toonStatus(status) {
  if (status.staat === "laden")   { zetStatus("bezig", pictogram("bezig") + "<span>Gegevens ophalen...</span>"); return; }
  if (status.staat === "wachten") { zetStatus("bezig", pictogram("bezig") + "<span>Nog niet bewaard</span>"); return; }
  if (status.staat === "bezig")   { zetStatus("bezig", pictogram("bezig") + "<span>Bewaren...</span>"); return; }

  // klaar: opgehaald (na het openen, nog niets gewijzigd) of bewaard, met de tijd
  if (status.staat === "opgehaald" || status.staat === "bewaard") {
    const t = status.tijd;
    const tweecijfers = n => String(n).padStart(2, "0");
    const wat = status.staat === "opgehaald" ? "Opgehaald" : "Bewaard";
    zetStatus("bewaard", pictogram("bewaard") +
      `<span>${wat} om ${tweecijfers(t.getHours())}:${tweecijfers(t.getMinutes())}</span>`);
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
    zetStatus("fout", pictogram("fout") + `<span>Niet bewaard - ${status.fout.tekst}</span>`);
  }
}

/* ---------------- de kop: waar je bent ----------------
   Twee regels in de donkere balk: klein het pad (gebouw / zaal), groot de
   titel (de vereniging, of de naam van het scherm). */
function toonKruimel(pad, titel) {
  const kruimel = document.getElementById("kruimel");
  kruimel.innerHTML = "";
  if (pad) {
    const p = document.createElement("span");
    p.className = "kruimelpad";
    p.textContent = pad;
    kruimel.appendChild(p);
  }
  const t = document.createElement("b");
  t.className = "kruimeltitel";
  t.textContent = titel;
  kruimel.appendChild(t);
}

/* ---------------- schermen wisselen ---------------- */

/* Scherm 1 (het overzicht) en scherm 4 (afdrukken) hebben geen plattegrond en
   geen gereedschap- of eigenschappenpaneel; de andere twee schermen gebruiken
   juist precies dat. Hier staat op één plek welke delen van `main` bij welk
   scherm horen. */
function toonLayout(scherm) {
  const isStart = scherm === "start";
  const isAfdrukken = scherm === "afdrukken";
  const isBeheer = scherm === "beheer";
  const zonderPlattegrond = isStart || isAfdrukken || isBeheer;

  // het tekenscherm heeft de gereedschapsstrook met uitklappers; alleen
  // Zalen inrichten gebruikt nog de lijst links
  document.getElementById("gereedschap").hidden = scherm !== "zaal";
  document.getElementById("strook").hidden = scherm !== "tekenen";
  document.querySelector(".stage").hidden = zonderPlattegrond;
  document.getElementById("paneelRechts").hidden = zonderPlattegrond;
  document.getElementById("startscherm").hidden = !isStart;
  document.getElementById("afdrukscherm").hidden = !isAfdrukken;
  document.getElementById("beheerscherm").hidden = !isBeheer;
  document.getElementById("ongedaan").hidden = zonderPlattegrond;
  document.getElementById("hulpKnop").hidden = zonderPlattegrond;
  document.getElementById("afdrukKnop").hidden = scherm !== "tekenen";
  // het overzicht heeft geen bovenbalk, maar een eigen donkere zijbalk
  document.querySelector("header").hidden = isStart;
  // "‹ Overzicht" links in de balk; niet nodig op het overzicht zelf
  document.getElementById("wordmark").hidden = isStart;
  if (zonderPlattegrond) toonHulp(false);
}

function naarStart() {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermStart;
  toonLayout("start");
  toonKruimel("", "Overzicht");
  SchermStart.open();
  zetStatus(laatsteStatus.state, laatsteStatus.html);   // de status in de nieuwe zijbalk
}

function naarTekenen(opstelling) {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermTekenen;
  toonLayout("tekenen");
  SchermStart.gekozenZaalId = opstelling.zaalId;   // terug naar het overzicht: deze zaal

  const zaal = Model.zaal(opstelling.zaalId);
  const gebouw = Model.gebouw(zaal.gebouwId);
  const vereniging = opstelling.verenigingId && Model.vereniging(opstelling.verenigingId);
  toonKruimel(`${gebouw.naam} / ${zaal.naam}`, vereniging ? vereniging.naam : "Naamloze opstelling");

  // terug naar het overzicht gaat via "‹ Overzicht" links in de balk
  document.getElementById("wisselScherm").hidden = true;
  document.getElementById("hint").innerHTML = HINT_TEKENEN;
  SchermTekenen.open(opstelling);
}

/* selectie: { scope: "opstelling", opstelling } of { scope: "zaal", zaal } of
   { scope: "alles" } — zie schermen/afdrukken.js. */
function naarAfdrukken(selectie) {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermAfdrukken;
  toonLayout("afdrukken");

  if (selectie.scope === "opstelling") {
    const zaal = Model.zaal(selectie.opstelling.zaalId);
    const gebouw = Model.gebouw(zaal.gebouwId);
    toonKruimel(`${gebouw.naam} / ${zaal.naam}`, "Afdrukken");
    document.getElementById("wisselScherm").textContent = "Terug naar tekenen";
    document.getElementById("wisselScherm").hidden = false;
  } else if (selectie.scope === "zaal") {
    const gebouw = Model.gebouw(selectie.zaal.gebouwId);
    toonKruimel(`${gebouw.naam} / ${selectie.zaal.naam}`, "Afdrukken");
    document.getElementById("wisselScherm").hidden = true;
  } else {
    toonKruimel("", "Hele map afdrukken");
    document.getElementById("wisselScherm").hidden = true;
  }

  SchermAfdrukken.open(selectie);
}

function naarZalenInrichten() {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermZaal;
  toonLayout("zaal");
  toonKruimel("", "Zalen inrichten");
  document.getElementById("wisselScherm").hidden = true;
  document.getElementById("hint").innerHTML = HINT_ZAAL;
  document.getElementById("ongedaan").disabled = !SchermZaal.ongedaanStapel.length;
  SchermZaal.open();
}

function naarBeheer() {
  if (HuidigScherm && HuidigScherm.sluiten) HuidigScherm.sluiten();
  HuidigScherm = SchermBeheer;
  toonLayout("beheer");
  toonKruimel("", "Beheer");
  document.getElementById("wisselScherm").hidden = true;
  SchermBeheer.open();
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
  SchermBeheer.opWijziging  = () => Opslag.bewaarStraks(Model.alsTekst());
  toonStatus({ staat: "opgehaald", tijd: new Date() });
  naarStart();
}

function start() {
  Opslag.meld = toonStatus;
  document.getElementById("kopzegel").alt = `Zegel van de ${Model.gemeente}`;

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
    if (HuidigScherm === SchermAfdrukken) {
      if (SchermAfdrukken.scope === "opstelling") naarTekenen(SchermAfdrukken.opstelling);
      else naarStart();
    }
    else naarStart();
  };
  document.getElementById("afdrukKnop").onclick = () => {
    if (HuidigScherm === SchermTekenen) naarAfdrukken({ scope: "opstelling", opstelling: SchermTekenen.opstelling });
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
