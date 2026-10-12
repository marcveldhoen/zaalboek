/* schermen/tekenen.js — scherm 3: een opstelling tekenen.

   Dit bestand gaat over de bediening: wat je kunt plaatsen, kiezen, slepen,
   draaien en instellen. Hoe de tekening eruitziet, staat in tekening.js. */

const SchermTekenen = {

  opstelling: null,
  zaal: null,
  geselecteerd: null,          // een verwijzing naar het element zelf, niet een nummer
  beeld: { x: 0, y: 0, w: 0, h: 0 },
  sleep: null,
  ongedaanStapel: [],
  groepen: [],                 // wat er in de uitklappers staat (zie paletGroepen)
  uitklapOpen: null,           // het nummer van de open uitklapper, of null

  open(opstelling) {
    this.opstelling = opstelling;
    this.zaal = Model.zaal(opstelling.zaalId);

    this.svg = document.getElementById("plan");
    this.gElementen = document.getElementById("elementen");

    this.vulGereedschap();
    Tekening.zaal(this.zaal, {
      raster:     document.getElementById("raster"),
      ruimte:     document.getElementById("ruimte"),
      vast:       document.getElementById("vast"),
      schaalstok: document.getElementById("schaalstok"),
      naam:       document.getElementById("naam")
    });

    this.bedieningAanzetten();
    this.passend();
    this.teken();
  },

  /* Wordt door app.js ingevuld en na elke wijziging aangeroepen. Zo hoeft dit
     scherm niets te weten van waar de gegevens bewaard worden. */
  opWijziging: null,

  /* Opnieuw tekenen na elke wijziging. Tijdens het slepen gebeurt dit met opzet
     niet: dan wordt alleen het gesleepte element verplaatst. Zie sleepBeweeg. */
  teken() {
    Tekening.elementen(this.opstelling, this.gElementen, this.geselecteerd);
    this.toonEigenschappen();
    this.toonTelling();
    if (this.opWijziging) this.opWijziging();
  },

  /* ---------------- wat je kunt plaatsen ----------------
     Elke tegel toont een echte, kleine tekening van het meubelstuk — gemaakt
     door Tekening.element() aan te roepen op een minimale voorbeeldwaarde.
     Dat raakt de tekencode zelf niet aan, het gebruikt hem alleen. Alle
     tegels delen dezelfde breedte in de viewBox (240 cm), zodat ze ook
     onderling op schaal met elkaar te vergelijken blijven; alleen de hoogte
     verschilt per soort. */

  paletGroepen() {
    const H = { tafel: 130, tafelkring: 260, rij: 80, kring: 200, stoel: 80, object: 100 };
    const stoel = Model.meubel("stoel");

    const tafels = Model.meubeltypen("tafel").map(m => ({
      plaats: "tafel", meubelId: m.id, naam: m.korteNaam || m.naam,
      maat: `${m.breedte}×${m.diepte}`, H: H.tafel,
      voorbeeld: { type: "tafel", meubelId: m.id, x: 0, y: 0, hoek: 0,
        stoelen: { boven: 0, onder: 0, links: 0, rechts: 0 }, functie: "geen" }
    }));

    /* Een kring van tafels heeft alleen zin bij een tafel die toeloopt; een
       rechthoekige tafel sluit nooit aan. Vandaar één tegel per trapeziumsoort. */
    const tafelkringen = Model.meubeltypen("tafel").filter(m => m.vorm === "trapezium").map(m => ({
      plaats: "tafelkring", meubelId: m.id, naam: "Tafelkring", H: H.tafelkring,
      maat: "trapeziumtafels in een ring; het aantal bepaalt de maat", breed: true,
      voorbeeld: Model.nieuwElement("tafelkring", m.id, 0, 0)
    }));

    const objecten = Model.meubeltypen("object").map(m => ({
      plaats: "object", meubelId: m.id, naam: m.naam,
      maat: `${m.breedte}×${m.diepte}`, H: H.object,
      voorbeeld: { type: "object", meubelId: m.id, x: 0, y: 0, hoek: 0 }
    }));

    return [
      { titel: "Tafels", tegels: [...tafels, ...tafelkringen] },
      { titel: "Stoelen", tegels: [
        { plaats: "rij", meubelId: null, naam: "Rij", maat: "aantal kiezen", H: H.rij,
          voorbeeld: { type: "rij", n: 4, x: 0, y: 0, hoek: 0 } },
        { plaats: "kring", meubelId: null, naam: "Kring", maat: "aantal kiezen", H: H.kring,
          voorbeeld: { type: "kring", n: 8, opening: 0, vorm: "rond", rx: 70, ry: 70, x: 0, y: 0, hoek: 0 } },
        { plaats: "stoel", meubelId: null, naam: "Losse stoel",
          maat: `${stoel.breedte}×${stoel.diepte}`, H: H.stoel,
          voorbeeld: { type: "stoel", x: 0, y: 0, hoek: 0 } }
      ] },
      { titel: "Objecten", tegels: objecten }
    ];
  },

  /* De drie knoppen in de gereedschapsstrook. Wat erin staat, verschijnt pas
     bij het openklappen (toonUitklap); er is steeds hooguit één open. */
  vulGereedschap() {
    this.groepen = this.paletGroepen();
    const iconen = [
      '<rect x="1" y="4" width="18" height="8" rx="1"/>',
      '<rect x="1" y="5" width="5" height="6" rx="1"/><rect x="7.5" y="5" width="5" height="6" rx="1"/><rect x="14" y="5" width="5" height="6" rx="1"/>',
      '<rect x="1" y="3" width="18" height="7" rx="1"/><path d="M3 12.5h14"/>'
    ];
    document.getElementById("uitklapknoppen").innerHTML = this.groepen.map((groep, gi) => `
      <button class="uitklapknop" data-uitklap="${gi}" aria-expanded="false" aria-controls="uitklap">
        <svg class="mini" viewBox="0 0 20 16" aria-hidden="true">${iconen[gi] || iconen[2]}</svg>
        ${groep.titel}
        <svg class="pijl" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5l3.5 3.5 3.5-3.5"/></svg>
      </button>`).join("");
    this.toonUitklap(null);
  },

  /* Een uitklapper openen (gi = het nummer van de groep) of sluiten (null). */
  toonUitklap(gi) {
    this.uitklapOpen = gi;
    document.querySelectorAll("[data-uitklap]").forEach(knop =>
      knop.setAttribute("aria-expanded", String(gi !== null && +knop.dataset.uitklap === gi)));

    const vak = document.getElementById("uitklap");
    vak.hidden = gi === null;
    vak.innerHTML = "";
    if (gi === null) return;

    const groep = this.groepen[gi];
    vak.innerHTML = `<div class="uitklapkop"><b>${groep.titel}</b><span>Klik om te plaatsen</span></div>
      <div class="tegels"></div>`;
    const grid = vak.querySelector(".tegels");

    groep.tegels.forEach(t => {
      const knop = document.createElement("button");
      knop.className = "tile" + (t.breed ? " breed" : "");
      knop.dataset.plaats = t.plaats;
      if (t.meubelId) knop.dataset.meubel = t.meubelId;
      knop.innerHTML = `<span class="tart"></span><span class="tn">${t.naam}</span><span class="tm">${t.maat}</span>`;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `-120 ${-t.H / 2} 240 ${t.H}`);
      svg.setAttribute("aria-hidden", "true");
      knop.querySelector(".tart").appendChild(svg);
      grid.appendChild(knop);   // eerst aan de pagina hangen, anders geeft getBBox() hieronder niets terug

      const g = Tekening.element(t.voorbeeld, svg, 0, false);

      /* Een tafelkring heeft geen vast formaat zoals de andere tegels: hoeveel
         tafels en stoelen erin passen volgt uit de maat van de trapeziumtafel,
         en dat is al snel groter dan het gedeelde kader van 240 cm breed —
         dan viel een deel van de kring erbuiten. Dit type krijgt daarom zijn
         eigen kader, afgemeten op de tekening zelf. */
      if (t.plaats === "tafelkring") {
        const b = g.getBBox();
        const marge = 16;
        svg.setAttribute("viewBox",
          `${b.x - marge} ${b.y - marge} ${b.width + marge * 2} ${b.height + marge * 2}`);
      }
    });
  },

  plaats(type, meubelId) {
    this.momentopname();
    // in het midden van het deel van het werkvlak dat niet achter de
    // uitklapper ligt (zie passend)
    const vak = this.svg.getBoundingClientRect();
    const vrij = this.uitklapRuimte(vak) * this.beeld.w / vak.width;
    const midden = {
      x: Math.round((this.beeld.x + vrij + (this.beeld.w - vrij) / 2) / 5) * 5,
      y: Math.round((this.beeld.y + this.beeld.h / 2) / 5) * 5
    };
    const element = Model.nieuwElement(type, meubelId, midden.x, midden.y);
    this.opstelling.elementen.push(element);
    this.geselecteerd = element;
    this.teken();
  },

  /* ---------------- ongedaan maken ---------------- */

  momentopname() {
    this.ongedaanStapel.push(JSON.stringify(this.opstelling.elementen));
    if (this.ongedaanStapel.length > 60) this.ongedaanStapel.shift();
    document.getElementById("ongedaan").disabled = false;
  },

  ongedaanMaken() {
    if (!this.ongedaanStapel.length) return;
    this.opstelling.elementen = JSON.parse(this.ongedaanStapel.pop());
    this.geselecteerd = null;    // de oude verwijzing bestaat niet meer
    document.getElementById("ongedaan").disabled = !this.ongedaanStapel.length;
    this.teken();
  },

  /* ---------------- het paneel rechts ---------------- */

  teller(label, waarde, actie, min, max) {
    return `<div class="teller"><label>${label}</label>
      <span class="stepper">
        <button data-stap="${actie}:-1" ${waarde <= min ? "disabled" : ""}>−</button>
        <span>${waarde}</span>
        <button data-stap="${actie}:1" ${waarde >= max ? "disabled" : ""}>+</button>
      </span></div>`;
  },

  toonEigenschappen() {
    const vak = document.getElementById("eigenschappen");
    const e = this.geselecteerd;

    if (!e) {
      vak.innerHTML = `<p class="selname">Niets gekozen</p>
        <p class="empty">Kies via Tafels, Stoelen of Objecten wat je wilt plaatsen.
        Klik daarna op een tafel, stoel of object om het aan te passen.</p>`;
      document.getElementById("selectieacties").innerHTML =
        `<span class="strookleeg">Klik op meubilair om het te kiezen</span>`;
      return;
    }

    let titel = "", onder = "", inhoud = "";

    if (e.type === "tafel") {
      const m = Model.meubel(e.meubelId);
      titel = m.naam;
      onder = `${m.breedte} × ${m.diepte} cm`;
      inhoud = `<h2>Stoelen per zijde</h2>
        <div class="tellers">
        ${this.teller("Boven",  e.stoelen.boven,  "zijde:boven",  0, 8)}
        ${this.teller("Onder",  e.stoelen.onder,  "zijde:onder",  0, 8)}
        ${this.teller("Links",  e.stoelen.links,  "zijde:links",  0, 8)}
        ${this.teller("Rechts", e.stoelen.rechts, "zijde:rechts", 0, 8)}
        </div>
        <h2>Functie</h2>
        <select id="functie">${Object.entries(Model.functies).map(([k, v]) =>
          `<option value="${k}" ${e.functie === k ? "selected" : ""}>${v}</option>`).join("")}</select>`;
    }
    else if (e.type === "rij") {
      titel = "Rij stoelen";
      onder = `${e.n} stoelen`;
      inhoud = `<h2>Maat</h2><div class="tellers">${this.teller("Aantal", e.n, "aantal", 2, 30)}</div>`;
    }
    else if (e.type === "kring") {
      const ovaal = e.vorm === "ovaal";
      titel = ovaal ? "Ovale kring" : "Kring";
      onder = e.opening ? `${e.n} stoelen, open aan één zijde` : `${e.n} stoelen, gesloten`;
      inhoud = `<h2>Vorm</h2>
        <select id="kringvorm">
          <option value="rond"  ${!ovaal ? "selected" : ""}>Rond</option>
          <option value="ovaal" ${ovaal ? "selected" : ""}>Ovaal</option>
        </select>
        <h2>Maat</h2>
        <div class="tellers">
        ${this.teller("Aantal", e.n, "aantal", 3, 40)}
        ${this.teller("Opening", e.opening, "opening", 0, 8)}
        ${ovaal
          ? this.teller("Breedte", e.rx * 2, "rx", 140, 1200) + this.teller("Diepte", e.ry * 2, "ry", 140, 1200)
          : this.teller("Doorsnede", e.rx * 2, "rx", 140, 1200)}
        </div>
        <div class="row"><button class="ghost" data-doe="passend">Passend maken</button></div>`;
    }
    else if (e.type === "tafelkring") {
      const bochtTafel = Model.meubel(e.meubelId);
      const maat = Tafelkring.buitenmaat(e);
      const meter = cm => (cm / 100).toFixed(2).replace(".", ",");
      const plaatsen = Tafelkring.plaatsen(e);
      const staan = plaatsen.filter(p => !p.weggelaten).length;

      titel = "Tafelkring";
      onder = `${staan} tafels · ${meter(maat.breedte)} × ${meter(maat.diepte)} m`;

      // de rechte tafels: alleen de soorten die niet toelopen
      const rechteSoorten = Model.meubeltypen("tafel").filter(m => m.vorm !== "trapezium");

      /* Eén teller per paar tegenover elkaar liggende zijden. Tegenover elkaar
         moet gelijk blijven, anders sluit de lus niet — zie tafelkring.js. */
      const zijdenamen = ["Boven en onder", "Rechtsboven en linksonder",
                          "Rechtsonder en linksboven"];
      const tellers = e.zijden.map((aantal, i) =>
        this.teller(zijdenamen[i] || `Zijden ${i + 1}`, aantal, `zijde${i}`, 0, 4)
      ).join("");

      inhoud = `<h2>Rechte tafels ertussen</h2>
        <select id="rechtesoort">${rechteSoorten.map(m =>
          `<option value="${m.id}" ${e.rechteMeubelId === m.id ? "selected" : ""}>
             ${m.naam} ${m.breedte}×${m.diepte}</option>`).join("")}</select>
        <div class="tellers enkel">${tellers}</div>
        <h2>Stoelen</h2>
        <div class="tellers">${this.teller("Per tafel", e.stoelen, "stoelenPerTafel", 0, 4)}</div>
        <h2>Plaatsen</h2>
        <p class="selsub">Klik een tafel weg om de kring
          open te laten. De andere tafels blijven staan.</p>
        <div class="plaatsen">
          ${plaatsen.map(p => `
            <button class="plaatsknop${p.soort === "bocht" ? " bocht" : ""}${p.weggelaten ? " weg" : ""}"
              data-doe="weglaten:${p.nummer}" title="${p.meubel.naam}">${p.nummer + 1}</button>`).join("")}
        </div>
        <p class="selsub">Gekleurd = trapeziumtafel (de bochten).</p>`;
    }
    else if (e.type === "stoel") {
      const m = Model.meubel("stoel");
      titel = "Losse stoel";
      onder = `${m.breedte} × ${m.diepte} cm`;
    }
    else if (e.type === "object") {
      const m = Model.meubel(e.meubelId);
      titel = m.naam;
      onder = `${m.breedte} × ${m.diepte} cm`;
    }

    vak.innerHTML = `<p class="selname">${titel}</p><p class="selsub">${onder}</p>${inhoud}`;

    // draaien, dupliceren en verwijderen staan in de gereedschapsstrook
    document.getElementById("selectieacties").innerHTML = `
      <span class="strooknaam">${titel}:</span>
      <button class="strookactie" data-doe="draai-">Draai ↺</button>
      <button class="strookactie" data-doe="draai+">Draai ↻</button>
      <button class="strookactie" data-doe="dupliceer">Dupliceren</button>
      <button class="strookactie gevaar" data-doe="verwijder">Verwijderen</button>`;

    const functie = document.getElementById("functie");
    if (functie) functie.onchange = ev => {
      this.momentopname();
      e.functie = ev.target.value;
      this.teken();
    };

    const kringvorm = document.getElementById("kringvorm");
    if (kringvorm) kringvorm.onchange = ev => {
      this.momentopname();
      e.vorm = ev.target.value;
      // een ovaal begint als een afgeplatte versie van de ronde kring
      e.ry = e.vorm === "rond" ? e.rx : Math.max(70, Math.round(e.rx * 0.62 / 5) * 5);
      this.teken();
    };

    const rechtesoort = document.getElementById("rechtesoort");
    if (rechtesoort) rechtesoort.onchange = ev => {
      this.momentopname();
      e.rechteMeubelId = ev.target.value;
      this.teken();
    };
  },

  toonTelling() {
    const regels = Telling.regels(this.opstelling, this.zaal);
    const tekorten = regels.filter(r => r.tekort > 0);

    // per soort "gebruikt van wat er in de zaal staat"; een tekort met icoon
    // én kleur, en daaronder een waarschuwing in woorden — nooit een blokkade
    let html = `<h2>In deze opstelling</h2>` + regels.map(r =>
      `<div class="tline ${r.tekort ? "over" : ""}">
         <span>${r.tekort ? WAARSCHUWING_ICOON : ""}${r.naam}</span><b>${r.aantal} van ${r.voorraad}</b>
       </div>`).join("") +
      `<div class="tline"><span>Aantal personen</span><b>${Telling.aantalPersonen(this.opstelling)}</b></div>`;

    if (tekorten.length) {
      html += `<div class="waarschuwing">${WAARSCHUWING_ICOON}<p>` + tekorten.map(r =>
        `${r.tekort} ${r.naam.toLowerCase()} meer dan er in deze zaal staan.`
      ).join("<br>") + `<br>Halen uit een andere zaal.</p></div>`;
    }

    document.getElementById("telling").innerHTML = html;
  },

  /* ---------------- zoomen en verschuiven ---------------- */

  toonBeeld() {
    this.svg.setAttribute("viewBox", `${this.beeld.x} ${this.beeld.y} ${this.beeld.w} ${this.beeld.h}`);
    if (this.fitW) document.getElementById("zpct").textContent = Math.round(this.fitW / this.beeld.w * 100) + "%";
  },

  /* fitW is de breedte van het passende beeld: het getal waartegen het
     percentage in de zoombalk wordt afgezet ("100%" is dus "passend"). */
  /* Hoeveel schermpixels links op het werkvlak vrij blijven voor een
     uitklapper (Tafels, Stoelen, Objecten), zodat die de plattegrond niet
     bedekt. Is het werkvlak daarvoor te smal, dan niets: de uitklapper ligt
     dan over de tekening heen, zonder dat de plattegrond verschuift. */
  uitklapRuimte(vak) {
    const ruimte = 296 + 32;
    return vak.width - ruimte >= 420 ? ruimte : 0;
  },

  passend() {
    const k = Tekening.kader(this.zaal), M = 220;
    const zaalB = k.x1 - k.x0 + M * 2, zaalD = k.y1 - k.y0 + M * 2;
    const vak = this.svg.getBoundingClientRect();
    const vrij = this.uitklapRuimte(vak);

    // centimeters per schermpixel: de zaal past in het deel rechts van de uitklapper
    const schaal = Math.max(zaalB / (vak.width - vrij), zaalD / vak.height);
    const b = vak.width * schaal, d = vak.height * schaal;
    const restB = (vak.width - vrij) * schaal;

    this.beeld = { x: k.x0 - M - (restB - zaalB) / 2 - vrij * schaal,
                   y: k.y0 - M - (d - zaalD) / 2, w: b, h: d };
    this.fitW = b;
    this.toonBeeld();
  },

  zoom(factor, x, y) {
    this.beeld = {
      x: x - (x - this.beeld.x) * factor,
      y: y - (y - this.beeld.y) * factor,
      w: this.beeld.w * factor,
      h: this.beeld.h * factor
    };
    this.toonBeeld();
  },

  /* Van een muispositie op het scherm naar centimeters in de zaal. */
  naarZaal(ev) {
    const p = this.svg.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(this.svg.getScreenCTM().inverse());
  },

  /* ---------------- slepen ---------------- */

  sleepBegin(ev) {
    const groep = ev.target.closest("g[data-volgnummer]");
    const p = this.naarZaal(ev);

    if (groep) {
      const element = this.opstelling.elementen[+groep.dataset.volgnummer];
      this.geselecteerd = element;
      this.momentopname();
      this.teken();   // hertekenen, want de markering verandert

      // de groep van zojuist is bij het hertekenen vervangen; opnieuw opzoeken
      const nummer = this.opstelling.elementen.indexOf(element);
      this.sleep = {
        wat: "element",
        element,
        groep: this.gElementen.querySelector(`g[data-volgnummer="${nummer}"]`),
        dx: p.x - element.x,
        dy: p.y - element.y,
        bewogen: false
      };
    } else {
      this.geselecteerd = null;
      this.sleep = { wat: "beeld", x: ev.clientX, y: ev.clientY,
                     beeldX: this.beeld.x, beeldY: this.beeld.y };
      this.svg.classList.add("panning");
      this.teken();
    }
    this.svg.setPointerCapture(ev.pointerId);
  },

  sleepBeweeg(ev) {
    if (!this.sleep) return;

    if (this.sleep.wat === "element") {
      const p = this.naarZaal(ev);
      const e = this.sleep.element;
      e.x = Math.round((p.x - this.sleep.dx) / 5) * 5;   // vast op vijf centimeter
      e.y = Math.round((p.y - this.sleep.dy) / 5) * 5;
      this.sleep.bewogen = true;

      /* Alleen dit ene element verplaatsen. De hele tekening opnieuw maken bij
         elke muisbeweging zou bij veel meubilair gaan haperen, en er verandert
         verder niets aan het beeld door een verplaatsing. */
      this.sleep.groep.setAttribute("transform", `translate(${e.x} ${e.y}) rotate(${e.hoek})`);
    } else {
      const vak = this.svg.getBoundingClientRect();
      const schaal = this.beeld.w / vak.width;
      this.beeld.x = this.sleep.beeldX - (ev.clientX - this.sleep.x) * schaal;
      this.beeld.y = this.sleep.beeldY - (ev.clientY - this.sleep.y) * schaal;
      this.toonBeeld();
    }
  },

  sleepEinde() {
    if (this.sleep && this.sleep.wat === "element") {
      if (this.sleep.bewogen) {
        // één keer hertekenen aan het einde; dat is ook het sein om te bewaren
        this.sleep = null;
        this.teken();
      } else {
        // alleen aanklikken zonder verplaatsen hoeft niet ongedaan gemaakt te kunnen worden
        this.ongedaanStapel.pop();
        document.getElementById("ongedaan").disabled = !this.ongedaanStapel.length;
      }
    }
    this.sleep = null;
    this.svg.classList.remove("panning");
  },

  /* ---------------- knoppen en toetsen ---------------- */

  bedieningAanzetten() {
    this._onUitklapKlik = ev => {
      const knop = ev.target.closest("[data-plaats]");
      if (knop) this.plaats(knop.dataset.plaats, knop.dataset.meubel || null);
    };
    document.getElementById("uitklap").addEventListener("click", this._onUitklapKlik);

    // de strook: een uitklapper open- of dichtklappen, of een actie op de keuze
    this._onStrookKlik = ev => {
      const knop = ev.target.closest("[data-uitklap]");
      if (knop) {
        const gi = +knop.dataset.uitklap;
        this.toonUitklap(this.uitklapOpen === gi ? null : gi);
        return;
      }
      if (ev.target.closest("#selectieacties")) this.paneelKlik(ev);
    };
    document.getElementById("strook").addEventListener("click", this._onStrookKlik);

    this._onPointerDown = ev => this.sleepBegin(ev);
    this._onPointerMove = ev => this.sleepBeweeg(ev);
    this._onPointerUp   = () => this.sleepEinde();
    this._onWheel = ev => {
      ev.preventDefault();
      const p = this.naarZaal(ev);
      this.zoom(ev.deltaY > 0 ? 1.12 : 0.89, p.x, p.y);
    };
    this.svg.addEventListener("pointerdown", this._onPointerDown);
    this.svg.addEventListener("pointermove", this._onPointerMove);
    this.svg.addEventListener("pointerup",   this._onPointerUp);
    this.svg.addEventListener("wheel", this._onWheel, { passive: false });

    document.getElementById("zoomin").onclick =
      () => this.zoom(0.8, this.beeld.x + this.beeld.w / 2, this.beeld.y + this.beeld.h / 2);
    document.getElementById("zoomuit").onclick =
      () => this.zoom(1.25, this.beeld.x + this.beeld.w / 2, this.beeld.y + this.beeld.h / 2);
    document.getElementById("zoompassend").onclick = () => this.passend();

    this._onPaneelKlik = ev => this.paneelKlik(ev);
    document.getElementById("eigenschappen").addEventListener("click", this._onPaneelKlik);

    this._onKeydown = ev => this.toets(ev);
    document.addEventListener("keydown", this._onKeydown);

    this._onResize = () => this.toonBeeld();
    window.addEventListener("resize", this._onResize);
  },

  /* Aangeroepen door app.js vlak voordat een ander scherm opent, zodat deze
     bediening niet blijft meeluisteren op knoppen en toetsen die dan bij het
     andere scherm horen. */
  sluiten() {
    document.getElementById("uitklap").removeEventListener("click", this._onUitklapKlik);
    document.getElementById("strook").removeEventListener("click", this._onStrookKlik);
    this.toonUitklap(null);
    this.svg.removeEventListener("pointerdown", this._onPointerDown);
    this.svg.removeEventListener("pointermove", this._onPointerMove);
    this.svg.removeEventListener("pointerup",   this._onPointerUp);
    this.svg.removeEventListener("wheel", this._onWheel);
    document.getElementById("eigenschappen").removeEventListener("click", this._onPaneelKlik);
    document.removeEventListener("keydown", this._onKeydown);
    window.removeEventListener("resize", this._onResize);
  },

  paneelKlik(ev) {
    const e = this.geselecteerd;
    if (!e) return;

    const stap = ev.target.dataset.stap;
    const doe = ev.target.dataset.doe;
    if (!stap && !doe) return;

    this.momentopname();

    if (stap) {
      const delen = stap.split(":");
      const wat = delen[0];
      const richting = +delen[delen.length - 1];

      if (wat === "zijde") {
        const zijde = delen[1];
        e.stoelen[zijde] = Math.max(0, Math.min(8, e.stoelen[zijde] + richting));
      }
      else if (wat === "aantal") {
        // per soort een eigen grens: een stoelenkring mag veel groter zijn dan
        // een tafelkring, die bij zestien tafels de zaal al vult
        const grens = { kring: [3, 40], tafelkring: [3, 16] }[e.type] || [2, 30];
        e.n = Math.max(grens[0], Math.min(grens[1], e.n + richting));
      }
      else if (wat === "stoelenPerTafel") {
        e.stoelen = Math.max(0, Math.min(4, e.stoelen + richting));
      }
      else if (wat.startsWith("zijde") && wat.length > 5) {
        /* Een rechte tafel erbij of eraf, aan een paar tegenover elkaar
           liggende zijden. Daarmee verschuiven alle plaatsen een nummer op, dus
           de weggelaten plaatsen zouden naar een andere tafel wijzen: die keuze
           gaat terug naar nul. */
        const nummer = +wat.slice(5);
        e.zijden[nummer] = Math.max(0, Math.min(4, e.zijden[nummer] + richting));
        e.weggelaten = [];
      }
      else if (wat === "opening") {
        e.opening = Math.max(0, Math.min(8, e.opening + richting));
      }
      else if (wat === "rx") {
        e.rx = Math.max(70, Math.min(600, e.rx + richting * 10));
        if (e.vorm !== "ovaal") e.ry = e.rx;
      }
      else if (wat === "ry") {
        e.ry = Math.max(70, Math.min(600, e.ry + richting * 10));
      }
    }

    if (doe === "draai+")  e.hoek = (e.hoek + 15) % 360;
    if (doe === "draai-")  e.hoek = (e.hoek + 345) % 360;
    if (doe === "passend") Kring.passendMaken(e);

    // een plaats in de tafelkring leegmaken of weer vullen
    if (doe && doe.startsWith("weglaten:")) {
      const nummer = +doe.slice(9);
      e.weggelaten = e.weggelaten.includes(nummer)
        ? e.weggelaten.filter(n => n !== nummer)
        : e.weggelaten.concat(nummer);
    }
    if (doe === "dupliceer") {
      const kopie = JSON.parse(JSON.stringify(e));
      kopie.x += 60; kopie.y += 60;
      this.opstelling.elementen.push(kopie);
      this.geselecteerd = kopie;
    }
    if (doe === "verwijder") {
      this.opstelling.elementen = this.opstelling.elementen.filter(x => x !== e);
      this.geselecteerd = null;
    }

    this.teken();
  },

  toets(ev) {
    if (ev.target.tagName === "SELECT") return;

    if (ev.key === "Escape" && this.uitklapOpen !== null) {
      this.toonUitklap(null);
      return;
    }

    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
      ev.preventDefault();
      this.ongedaanMaken();
      return;
    }

    const e = this.geselecteerd;
    if (!e) return;

    const stap = ev.shiftKey ? 25 : 5;
    const verschuiven = {
      ArrowLeft:  [-stap, 0], ArrowRight: [stap, 0],
      ArrowUp:    [0, -stap], ArrowDown:  [0, stap]
    };

    if (verschuiven[ev.key]) {
      ev.preventDefault();
      this.momentopname();
      e.x += verschuiven[ev.key][0];
      e.y += verschuiven[ev.key][1];
      this.teken();
    }
    if (ev.key === "r" || ev.key === "R") {
      this.momentopname();
      e.hoek = (e.hoek + (ev.shiftKey ? 345 : 15)) % 360;
      this.teken();
    }
    if (ev.key === "Backspace" || ev.key === "Delete") {
      ev.preventDefault();
      this.momentopname();
      this.opstelling.elementen = this.opstelling.elementen.filter(x => x !== e);
      this.geselecteerd = null;
      this.teken();
    }
  }
};
