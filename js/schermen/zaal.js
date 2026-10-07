/* schermen/zaal.js — scherm 6: een zaal vastleggen en inrichten.

   Stukje 1: een zaal aanmaken of aanpassen (gebouw, naam, vorm). Alles wat je
   intypt geeft meteen een nieuwe tekening — dat is de directe toets of
   zaalvorm.js een L-vorm goed omzet, ruim voordat er iets bewaard wordt.

   Stukje 2: vaste objecten (deuren, ramen, kasten) plaatsen, verslepen en
   aanpassen. Dat kan pas zodra de zaal zelf bewaard is — daarvoor bestaat er
   nog geen `vasteObjecten`-lijst om iets aan toe te voegen.

   Net als schermen/tekenen.js gebruikt dit de svg-groepen uit index.html, en
   heeft het een sluiten() zodat app.js netjes kan wisselen tussen de twee
   schermen zonder dat ze elkaars klikken en toetsen blijven horen. */

const SchermZaal = {

  zaal: null,               // de zaal die nu in het formulier staat; null = nog niet bewaard
  geselecteerdObject: null, // een aangeklikt vast object, of null
  beeld: { x: 0, y: 0, w: 0, h: 0 },
  sleep: null,
  ongedaanStapel: [],       // momentopnamen van zaal.vasteObjecten

  open() {
    this.svg = document.getElementById("plan");

    document.getElementById("kruimel").innerHTML = "Zalen inrichten";
    document.getElementById("telling").innerHTML = "";
    // het meubilair van het tekenscherm staat in een eigen groep die dit
    // scherm verder niet gebruikt; zonder dit blijft het als een spook
    // zichtbaar boven de lege omtrek
    document.getElementById("elementen").innerHTML = "";

    this.lijst();
    // Altijd starten met een lege, nieuwe zaal — nooit vanzelf een bestaande
    // selecteren. Zo zie je zelf aankomen welke zaal en welke vaste objecten
    // je opent, in plaats van dat het scherm die al toont.
    this.selecteer(null);
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
    // alleen een andere zaal maakt de vorige objectkeuze ongeldig; bewaren()
    // roept dit ook aan met dezelfde zaal, en dat mag de keuze laten staan
    if (zaal !== this.zaal) this.geselecteerdObject = null;
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
      ${z ? this.vasteObjectenSectie() : ""}
    `;

    this.vormVelden(vormType, z ? z.vorm : null);
    this.basisBediening();
    this.objectVeldBediening();
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

    ["raster", "ruimte", "vast", "schaalstok", "naam"].forEach(id => {
      document.getElementById(id).innerHTML = "";
    });
    if (!vorm) return;   // nog niet genoeg ingevuld om te tekenen

    const vasteObjecten = this.zaal ? this.zaal.vasteObjecten : [];
    Tekening.zaal({ naam, vorm, vasteObjecten }, {
      raster:     document.getElementById("raster"),
      ruimte:     document.getElementById("ruimte"),
      vast:       document.getElementById("vast"),
      schaalstok: document.getElementById("schaalstok"),
      naam:       document.getElementById("naam")
    }, this.geselecteerdObject);
    this.passend(vorm);
  },

  /* Alleen de vaste objecten opnieuw tekenen, zonder de rest van het
     formulier te herbouwen. Nodig tijdens het typen in het opschriftveld:
     formulier() zou dat veld vervangen en daarmee de cursor kwijtraken. */
  tekenVast() {
    Tekening.vasteObjecten(document.getElementById("vast"), this.zaal.vasteObjecten, this.geselecteerdObject);
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

  /* ---------------- vaste objecten ---------------- */

  vasteObjectenSectie() {
    const knoppen = Object.entries(Model.vasteObjectSoorten).map(([soort, basis]) =>
      `<button class="ghost" data-vastnieuw="${soort}">+ ${basis.naam}</button>`
    ).join("");

    return `
      <h2 style="margin-top:20px">Vaste objecten</h2>
      <div class="row">${knoppen}</div>
      ${this.objectFormulier()}
    `;
  },

  objectFormulier() {
    const o = this.geselecteerdObject;
    if (!o || !this.zaal.vasteObjecten.includes(o)) {
      this.geselecteerdObject = null;
      return `<p class="selsub" style="margin-top:12px">Klik een deur, raam of
        kast aan om hem te verslepen of aan te passen.</p>`;
    }

    const basis = Model.vasteObjectSoorten[o.soort];
    const naam = (basis && basis.naam) || o.opschrift || o.soort;

    return `
      <p class="selname" style="margin-top:16px">${naam}</p>
      ${this.teller("Breedte", o.breedte, "breedte", 20, 400)}
      ${o.diepte != null ? this.teller("Diepte", o.diepte, "diepte", 5, 100) : ""}
      ${o.soort === "deur" ? `
        <div class="row"><button class="ghost" data-doe="kant">Scharnierkant spiegelen</button></div>
      ` : ""}
      ${o.opschrift != null ? `
        <div class="veld-vol"><label>Opschrift</label>
          <input type="text" id="vObjOpschrift" value="${o.opschrift}"></div>
      ` : ""}
      <div class="row">
        <button class="ghost" data-doe="draai-">Draai ↺</button>
        <button class="ghost" data-doe="draai+">Draai ↻</button>
      </div>
      <div class="row">
        <button class="ghost" data-doe="dupliceer">Dupliceren</button>
        <button class="ghost" data-doe="verwijder">Verwijderen</button>
      </div>
    `;
  },

  teller(label, waarde, actie, min, max) {
    return `<div class="field"><label>${label}</label>
      <span class="stepper">
        <button data-stap="${actie}:-1" ${waarde <= min ? "disabled" : ""}>−</button>
        <span>${waarde}</span>
        <button data-stap="${actie}:1" ${waarde >= max ? "disabled" : ""}>+</button>
      </span></div>`;
  },

  /* Het opschriftveld van een kast: bijwerken zonder het paneel te herbouwen,
     zodat je niet bij elke letter de cursor kwijtraakt. */
  objectVeldBediening() {
    const veld = document.getElementById("vObjOpschrift");
    if (!veld) return;

    veld.addEventListener("focus", () => this.momentopname());
    veld.addEventListener("input", () => {
      this.geselecteerdObject.opschrift = veld.value;
      this.tekenVast();
      if (this.opWijziging) this.opWijziging();
    });
  },

  plaatsNieuwVastObject(soort) {
    if (!this.zaal) return;
    this.momentopname();

    const midden = {
      x: Math.round((this.beeld.x + this.beeld.w / 2) / 5) * 5,
      y: Math.round((this.beeld.y + this.beeld.h / 2) / 5) * 5
    };
    const object = Model.nieuwVastObject(soort, midden.x, midden.y);
    this.zaal.vasteObjecten.push(object);
    this.geselecteerdObject = object;
    this.vastGewijzigd();
  },

  /* Na een wijziging aan een vast object: bewaren en het paneel + de
     tekening verversen — net als teken() in schermen/tekenen.js. */
  vastGewijzigd() {
    if (this.opWijziging) this.opWijziging();
    this.formulier();
  },

  /* ---------------- ongedaan maken ----------------
     Alleen de vaste objecten vallen hieronder; vorm, naam en gebouw worden
     pas gewijzigd op het moment van Bewaren en horen daar niet bij. */

  momentopname() {
    if (!this.zaal) return;
    this.ongedaanStapel.push(JSON.stringify(this.zaal.vasteObjecten));
    if (this.ongedaanStapel.length > 60) this.ongedaanStapel.shift();
    document.getElementById("ongedaan").disabled = false;
  },

  ongedaanMaken() {
    if (!this.zaal || !this.ongedaanStapel.length) return;
    this.zaal.vasteObjecten = JSON.parse(this.ongedaanStapel.pop());
    this.geselecteerdObject = null;    // de oude verwijzing bestaat niet meer
    document.getElementById("ongedaan").disabled = !this.ongedaanStapel.length;
    if (this.opWijziging) this.opWijziging();
    this.formulier();
  },

  /* ---------------- zoomen en verschuiven ---------------- */

  toonBeeld() {
    this.svg.setAttribute("viewBox", `${this.beeld.x} ${this.beeld.y} ${this.beeld.w} ${this.beeld.h}`);
    if (this.fitW) document.getElementById("zpct").textContent = Math.round(this.fitW / this.beeld.w * 100) + "%";
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

  naarZaal(ev) {
    const p = this.svg.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(this.svg.getScreenCTM().inverse());
  },

  /* ---------------- slepen ----------------
     Hetzelfde principe als in schermen/tekenen.js: een vast object aangeklikt
     verplaatst dat object, lege ruimte aangeklikt verschuift de plattegrond. */

  sleepBegin(ev) {
    const groep = ev.target.closest("g[data-vast]");
    const p = this.naarZaal(ev);

    if (groep && this.zaal) {
      const object = this.zaal.vasteObjecten[+groep.dataset.vast];
      this.momentopname();
      this.geselecteerdObject = object;
      this.formulier();   // het paneel en de markering bijwerken

      // het paneel is zojuist herbouwd; de gesleepte groep opnieuw opzoeken
      const nummer = this.zaal.vasteObjecten.indexOf(object);
      this.sleep = {
        wat: "object",
        object,
        groep: document.getElementById("vast").querySelector(`g[data-vast="${nummer}"]`),
        dx: p.x - object.x,
        dy: p.y - object.y,
        bewogen: false
      };
    } else {
      this.geselecteerdObject = null;
      if (this.zaal) this.formulier();
      this.sleep = { wat: "beeld", x: ev.clientX, y: ev.clientY,
                     beeldX: this.beeld.x, beeldY: this.beeld.y };
      this.svg.classList.add("panning");
    }
    this.svg.setPointerCapture(ev.pointerId);
  },

  sleepBeweeg(ev) {
    if (!this.sleep) return;

    if (this.sleep.wat === "object") {
      const p = this.naarZaal(ev);
      const o = this.sleep.object;
      o.x = Math.round((p.x - this.sleep.dx) / 5) * 5;   // vast op vijf centimeter
      o.y = Math.round((p.y - this.sleep.dy) / 5) * 5;
      this.sleep.bewogen = true;
      this.sleep.groep.setAttribute("transform", `translate(${o.x} ${o.y}) rotate(${o.hoek})`);
    } else {
      const vak = this.svg.getBoundingClientRect();
      const schaal = this.beeld.w / vak.width;
      this.beeld.x = this.sleep.beeldX - (ev.clientX - this.sleep.x) * schaal;
      this.beeld.y = this.sleep.beeldY - (ev.clientY - this.sleep.y) * schaal;
      this.toonBeeld();
    }
  },

  sleepEinde() {
    if (this.sleep && this.sleep.wat === "object") {
      if (this.sleep.bewogen) {
        this.sleep = null;
        this.vastGewijzigd();
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
    // op de container geluisterd (niet op de knoppen zelf), want de lijst
    // wordt bij elke selectie opnieuw opgebouwd
    this._onGereedschapKlik = ev => {
      if (ev.target.closest("#nieuweZaalKnop")) { this.selecteer(null); return; }
      const knop = ev.target.closest("[data-zaal]");
      if (knop) this.selecteer(Model.zaal(knop.dataset.zaal));
    };
    document.getElementById("gereedschap").addEventListener("click", this._onGereedschapKlik);

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
    document.getElementById("zoompassend").onclick = () => {
      const vorm = this.vormUitFormulier();
      if (vorm) this.passend(vorm);
    };

    this._onPaneelKlik = ev => this.paneelKlik(ev);
    document.getElementById("eigenschappen").addEventListener("click", this._onPaneelKlik);

    this._onKeydown = ev => this.toets(ev);
    document.addEventListener("keydown", this._onKeydown);
  },

  /* Aangeroepen door app.js vlak voordat er naar het tekenscherm wordt
     gewisseld, zodat deze bediening niet blijft meeluisteren. */
  sluiten() {
    document.getElementById("gereedschap").removeEventListener("click", this._onGereedschapKlik);
    this.svg.removeEventListener("pointerdown", this._onPointerDown);
    this.svg.removeEventListener("pointermove", this._onPointerMove);
    this.svg.removeEventListener("pointerup",   this._onPointerUp);
    this.svg.removeEventListener("wheel", this._onWheel);
    document.getElementById("eigenschappen").removeEventListener("click", this._onPaneelKlik);
    document.removeEventListener("keydown", this._onKeydown);
  },

  paneelKlik(ev) {
    const vastKnop = ev.target.closest("[data-vastnieuw]");
    if (vastKnop) { this.plaatsNieuwVastObject(vastKnop.dataset.vastnieuw); return; }

    const o = this.geselecteerdObject;
    if (!o) return;

    const stap = ev.target.dataset.stap;
    const doe = ev.target.dataset.doe;
    if (!stap && !doe) return;

    this.momentopname();

    if (stap) {
      const delen = stap.split(":");
      const richting = +delen[1];
      if (delen[0] === "breedte") o.breedte = Math.max(20, Math.min(400, o.breedte + richting * 5));
      if (delen[0] === "diepte")  o.diepte  = Math.max(5,  Math.min(100, o.diepte  + richting * 5));
    }

    // vaste objecten staan tegen rechte muren, dus draaien gaat in stappen van 90°
    if (doe === "draai+") o.hoek = (o.hoek + 90) % 360;
    if (doe === "draai-") o.hoek = (o.hoek + 270) % 360;
    if (doe === "kant")   o.kant = -o.kant;

    if (doe === "dupliceer") {
      const kopie = JSON.parse(JSON.stringify(o));
      kopie.x += 30; kopie.y += 30;
      this.zaal.vasteObjecten.push(kopie);
      this.geselecteerdObject = kopie;
    }
    if (doe === "verwijder") {
      this.zaal.vasteObjecten = this.zaal.vasteObjecten.filter(x => x !== o);
      this.geselecteerdObject = null;
    }

    this.vastGewijzigd();
  },

  toets(ev) {
    if (ev.target.tagName === "SELECT" || ev.target.tagName === "INPUT") return;

    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
      ev.preventDefault();
      this.ongedaanMaken();
      return;
    }

    const o = this.geselecteerdObject;
    if (!o) return;

    const stap = ev.shiftKey ? 25 : 5;
    const verschuiven = {
      ArrowLeft:  [-stap, 0], ArrowRight: [stap, 0],
      ArrowUp:    [0, -stap], ArrowDown:  [0, stap]
    };

    if (verschuiven[ev.key]) {
      ev.preventDefault();
      this.momentopname();
      o.x += verschuiven[ev.key][0];
      o.y += verschuiven[ev.key][1];
      this.vastGewijzigd();
    }
    if (ev.key === "r" || ev.key === "R") {
      this.momentopname();
      o.hoek = (o.hoek + (ev.shiftKey ? 270 : 90)) % 360;
      this.vastGewijzigd();
    }
    if (ev.key === "Backspace" || ev.key === "Delete") {
      ev.preventDefault();
      this.momentopname();
      this.zaal.vasteObjecten = this.zaal.vasteObjecten.filter(x => x !== o);
      this.geselecteerdObject = null;
      this.vastGewijzigd();
    }
  }
};
