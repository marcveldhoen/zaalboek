/* schermen/zaal.js — scherm 6, stukje 1: een zaal vastleggen.

   In dit eerste stukje kun je een zaal aanmaken of aanpassen: gebouw, naam en
   vorm (rechthoek of L-vorm). Alles wat je intypt geeft meteen een nieuwe
   tekening — dat is de directe toets of zaalvorm.js een L-vorm goed omzet,
   ruim voordat er iets bewaard wordt.

   Vaste objecten (deuren, ramen, kasten) en de voorraad komen in een volgend
   stukje. Dit scherm tekent daarom alleen de lege omtrek, zonder meubilair:
   er is hier geen opstelling.

   Net als schermen/tekenen.js gebruikt dit de svg-groepen uit index.html, en
   heeft het een sluiten() zodat app.js netjes kan wisselen tussen de twee
   schermen zonder dat ze elkaars klikken en toetsen blijven horen. */

const SchermZaal = {

  zaal: null,           // de zaal die nu in het formulier staat; null = nog niet bewaard
  beeld: { x: 0, y: 0, w: 0, h: 0 },
  sleep: null,

  open() {
    this.svg = document.getElementById("plan");

    document.getElementById("kruimel").innerHTML = "Zalen inrichten";
    document.getElementById("telling").innerHTML = "";

    this.lijst();
    this.selecteer(Model.document.zalen[0] || null);
    this.bedieningAanzetten();
  },

  /* Wordt door app.js ingevuld en na elke bewaarde wijziging aangeroepen. */
  opWijziging: null,

  /* ---------------- de lijst links ---------------- */

  lijst() {
    const balk = document.getElementById("gereedschap");

    const perGebouw = Model.document.gebouwen.map(gebouw => {
      const zalen = Model.document.zalen
        .filter(z => z.gebouwId === gebouw.id)
        .map(z => this.zaalKnop(z)).join("");
      return `<div class="group"><h2>${gebouw.naam}</h2>
        ${zalen || '<p class="empty">Nog geen zalen</p>'}</div>`;
    }).join("");

    balk.innerHTML = `
      <div class="group"><button class="ghost" id="nieuweZaalKnop" style="width:100%">+ Nieuwe zaal</button></div>
      ${perGebouw}`;
  },

  zaalKnop(zaal) {
    const k = Zaalvorm.kader(Zaalvorm.omtrek(zaal.vorm));
    const meter = cm => Math.round(cm / 10) / 10;
    const maat = `${meter(k.x1 - k.x0)} × ${meter(k.y1 - k.y0)} m`;
    const gekozen = this.zaal === zaal ? "gekozen" : "";
    return `<button class="tool ${gekozen}" data-zaal="${zaal.id}">
      ${zaal.naam}<span class="dim">${maat}</span></button>`;
  },

  selecteer(zaal) {
    this.zaal = zaal;
    this.lijst();        // opnieuw, voor de markering van de gekozen zaal
    this.formulier();
  },

  /* ---------------- het formulier rechts ---------------- */

  formulier() {
    const vak = document.getElementById("eigenschappen");
    const z = this.zaal;

    const gebouwOpties = Model.document.gebouwen.map(g =>
      `<option value="${g.id}" ${z && z.gebouwId === g.id ? "selected" : ""}>${g.naam}</option>`
    ).join("");

    const vormType = z ? z.vorm.type : "rechthoek";

    vak.innerHTML = `
      <p class="selname">${z ? z.naam : "Nieuwe zaal"}</p>
      <p class="selsub">${z ? Model.gebouw(z.gebouwId).naam : "Nog niet bewaard"}</p>

      <div class="veld-vol">
        <label>Gebouw</label>
        <select id="zGebouw">
          ${gebouwOpties}
          <option value="__nieuw__">+ Nieuw gebouw…</option>
        </select>
      </div>
      <div class="veld-vol" id="zNieuwGebouwVeld" hidden>
        <label>Naam van het nieuwe gebouw</label>
        <input type="text" id="zGebouwNaam">
      </div>
      <div class="veld-vol">
        <label>Naam van de zaal</label>
        <input type="text" id="zNaam" value="${z ? z.naam : ""}">
      </div>

      <h2 style="margin-top:20px">Vorm</h2>
      <div class="field"><label>Type</label>
        <select id="zVormType">
          <option value="rechthoek" ${vormType === "rechthoek" ? "selected" : ""}>Rechthoek</option>
          <option value="l-vorm" ${vormType === "l-vorm" ? "selected" : ""}>L-vorm</option>
        </select>
      </div>
      <div id="zVormVelden"></div>

      <div class="row"><button class="ghost" id="zBewaren">Bewaren</button></div>
      ${z ? `<div class="row"><button class="ghost" id="zVerwijderen">Verwijderen</button></div>` : ""}
    `;

    this.vormVelden(vormType, z ? z.vorm : null);
    this.basisBediening();
    this.herteken();
  },

  /* De maatvelden, afhankelijk van het gekozen type. Getoond in meters — zo
     denkt Marc over een zaal — maar in het document blijft alles in hele
     centimeters staan, zoals model.js voorschrijft. */
  vormVelden(type, vorm) {
    const m = cm => (cm != null ? Math.round(cm) / 100 : "");
    const doel = document.getElementById("zVormVelden");

    const maatveld = (id, label, waarde) => `
      <div class="field"><label>${label}</label>
        <input type="number" step="0.01" min="0.1" id="${id}" value="${waarde}"> m</div>`;

    if (type === "rechthoek") {
      doel.innerHTML =
        maatveld("zBreedte", "Breedte", m(vorm && vorm.breedte)) +
        maatveld("zDiepte",  "Diepte",  m(vorm && vorm.diepte));
    } else {
      const hoek = (vorm && vorm.hoek) || "rechtsboven";
      doel.innerHTML =
        maatveld("zBreedte", "Breedte", m(vorm && vorm.breedte)) +
        maatveld("zDiepte",  "Diepte",  m(vorm && vorm.diepte)) +
        `<div class="field"><label>Hap in de hoek</label>
          <select id="zHoek">
            <option value="rechtsonder" ${hoek === "rechtsonder" ? "selected" : ""}>rechtsonder</option>
            <option value="linksonder"  ${hoek === "linksonder"  ? "selected" : ""}>linksonder</option>
            <option value="rechtsboven" ${hoek === "rechtsboven" ? "selected" : ""}>rechtsboven</option>
            <option value="linksboven"  ${hoek === "linksboven"  ? "selected" : ""}>linksboven</option>
          </select></div>` +
        maatveld("zHapBreedte", "Hap breedte", m(vorm && vorm.hapBreedte)) +
        maatveld("zHapDiepte",  "Hap diepte",  m(vorm && vorm.hapDiepte));
    }

    // deze velden zijn zojuist (opnieuw) aangemaakt en hebben dus hun eigen listener nodig
    doel.querySelectorAll("input, select").forEach(veld => {
      veld.addEventListener("input",  () => this.herteken());
      veld.addEventListener("change", () => this.herteken());
    });
  },

  /* De vaste velden eromheen: eenmaal per formulier() gebonden, want die
     elementen worden niet opnieuw aangemaakt als alleen de vorm verandert. */
  basisBediening() {
    document.getElementById("zGebouw").onchange = () => {
      document.getElementById("zNieuwGebouwVeld").hidden =
        document.getElementById("zGebouw").value !== "__nieuw__";
    };
    document.getElementById("zNaam").addEventListener("input", () => this.herteken());

    document.getElementById("zVormType").onchange = ev => {
      this.vormVelden(ev.target.value, null);
      this.herteken();
    };

    document.getElementById("zBewaren").onclick = () => this.bewaren();

    const verwijderKnop = document.getElementById("zVerwijderen");
    if (verwijderKnop) verwijderKnop.onclick = () => this.verwijderen();
  },

  /* Leest het formulier, zonder iets te bewaren. Geeft null zolang de
     getallen nog niet compleet of geldig zijn — dan wordt er ook niet
     getekend, in plaats van met een halve zaal te raden. */
  vormUitFormulier() {
    const meter = id => {
      const veld = document.getElementById(id);
      if (!veld) return null;
      const v = parseFloat(veld.value);
      return isNaN(v) || v <= 0 ? null : Math.round(v * 100);
    };

    const type = document.getElementById("zVormType").value;
    const breedte = meter("zBreedte"), diepte = meter("zDiepte");
    if (!breedte || !diepte) return null;

    if (type === "rechthoek") return { type: "rechthoek", breedte, diepte };

    const hapBreedte = meter("zHapBreedte"), hapDiepte = meter("zHapDiepte");
    if (!hapBreedte || !hapDiepte) return null;
    return {
      type: "l-vorm", breedte, diepte,
      hoek: document.getElementById("zHoek").value,
      hapBreedte, hapDiepte
    };
  },

  herteken() {
    const vorm = this.vormUitFormulier();
    const naamVeld = document.getElementById("zNaam");
    const naam = (naamVeld && naamVeld.value.trim()) || "Nieuwe zaal";

    ["raster", "ruimte", "vast", "schaalstok"].forEach(id => {
      document.getElementById(id).innerHTML = "";
    });
    if (!vorm) return;   // nog niet genoeg ingevuld om te tekenen

    Tekening.zaal({ naam, vorm, vasteObjecten: [] }, {
      raster:     document.getElementById("raster"),
      ruimte:     document.getElementById("ruimte"),
      vast:       document.getElementById("vast"),
      schaalstok: document.getElementById("schaalstok")
    });
    this.passend(vorm);
  },

  /* ---------------- bewaren en verwijderen ---------------- */

  bewaren() {
    const vorm = this.vormUitFormulier();
    const naam = document.getElementById("zNaam").value.trim();
    if (!vorm || !naam) {
      alert("Vul een naam en een complete vorm in voordat je bewaart.");
      return;
    }

    let gebouwId = document.getElementById("zGebouw").value;
    if (gebouwId === "__nieuw__") {
      const gebouwNaam = document.getElementById("zGebouwNaam").value.trim();
      if (!gebouwNaam) { alert("Vul een naam voor het nieuwe gebouw in."); return; }
      gebouwId = Model.nieuwGebouw(gebouwNaam).id;
    }

    if (this.zaal) {
      // bestaande zaal bijwerken; de id blijft dezelfde, ook als naam of gebouw wijzigt
      Object.assign(this.zaal, { naam, gebouwId, vorm });
    } else {
      this.zaal = Model.nieuweZaal(gebouwId, naam, vorm);
    }

    if (this.opWijziging) this.opWijziging();
    this.selecteer(this.zaal);
  },

  verwijderen() {
    if (!this.zaal) return;
    if (!confirm(`"${this.zaal.naam}" verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;

    Model.document.zalen = Model.document.zalen.filter(z => z !== this.zaal);
    if (this.opWijziging) this.opWijziging();
    this.selecteer(Model.document.zalen[0] || null);
  },

  /* ---------------- zoomen en verschuiven ----------------
     Hetzelfde principe als in schermen/tekenen.js, maar zonder meubilair om
     te verslepen: hier is alleen de plattegrond zelf te bekijken. */

  toonBeeld() {
    this.svg.setAttribute("viewBox", `${this.beeld.x} ${this.beeld.y} ${this.beeld.w} ${this.beeld.h}`);
  },

  passend(vorm) {
    const k = Zaalvorm.kader(Zaalvorm.omtrek(vorm));
    const M = 220;
    const zaalB = k.x1 - k.x0 + M * 2, zaalD = k.y1 - k.y0 + M * 2;
    const vak = this.svg.getBoundingClientRect();
    const verhouding = (vak.width / vak.height) || 1;

    let b = zaalB, d = zaalD;
    if (zaalB / zaalD > verhouding) d = zaalB / verhouding; else b = zaalD * verhouding;

    this.beeld = { x: k.x0 - M - (b - zaalB) / 2, y: k.y0 - M - (d - zaalD) / 2, w: b, h: d };
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

  naarZaal(ev) {
    const p = this.svg.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(this.svg.getScreenCTM().inverse());
  },

  /* ---------------- knoppen en slepen ---------------- */

  bedieningAanzetten() {
    // op de container geluisterd (niet op de knoppen zelf), want de lijst
    // wordt bij elke selectie opnieuw opgebouwd
    this._onGereedschapKlik = ev => {
      if (ev.target.closest("#nieuweZaalKnop")) { this.selecteer(null); return; }
      const knop = ev.target.closest("[data-zaal]");
      if (knop) this.selecteer(Model.zaal(knop.dataset.zaal));
    };
    document.getElementById("gereedschap").addEventListener("click", this._onGereedschapKlik);

    this._onPointerDown = ev => {
      this.sleep = { x: ev.clientX, y: ev.clientY, beeldX: this.beeld.x, beeldY: this.beeld.y };
      this.svg.classList.add("panning");
      this.svg.setPointerCapture(ev.pointerId);
    };
    this._onPointerMove = ev => {
      if (!this.sleep) return;
      const vak = this.svg.getBoundingClientRect();
      const schaal = this.beeld.w / vak.width;
      this.beeld.x = this.sleep.beeldX - (ev.clientX - this.sleep.x) * schaal;
      this.beeld.y = this.sleep.beeldY - (ev.clientY - this.sleep.y) * schaal;
      this.toonBeeld();
    };
    this._onPointerUp = () => { this.sleep = null; this.svg.classList.remove("panning"); };
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
    document.getElementById("zoompassend").onclick = () => {
      const vorm = this.vormUitFormulier();
      if (vorm) this.passend(vorm);
    };
  },

  /* Aangeroepen door app.js vlak voordat er naar het tekenscherm wordt
     gewisseld, zodat deze bediening niet blijft meeluisteren. */
  sluiten() {
    document.getElementById("gereedschap").removeEventListener("click", this._onGereedschapKlik);
    this.svg.removeEventListener("pointerdown", this._onPointerDown);
    this.svg.removeEventListener("pointermove", this._onPointerMove);
    this.svg.removeEventListener("pointerup",   this._onPointerUp);
    this.svg.removeEventListener("wheel", this._onWheel);
  }
};
