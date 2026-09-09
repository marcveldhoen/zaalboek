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

  open(opstelling) {
    this.opstelling = opstelling;
    this.zaal = Model.zaal(opstelling.zaalId);

    this.vulZaalKiezer();

    this.svg = document.getElementById("plan");
    this.gElementen = document.getElementById("elementen");

    this.vulGereedschap();
    Tekening.zaal(this.zaal, {
      raster:     document.getElementById("raster"),
      ruimte:     document.getElementById("ruimte"),
      vast:       document.getElementById("vast"),
      schaalstok: document.getElementById("schaalstok")
    });

    this.bedieningAanzetten();
    this.passend();
    this.teken();
  },

  /* Wordt door app.js ingevuld en na elke wijziging aangeroepen. Zo hoeft dit
     scherm niets te weten van waar de gegevens bewaard worden. */
  opWijziging: null,

  /* Tijdelijk bruggetje zolang scherm 1 (het startscherm) er nog niet is: een
     keuzelijst in de kop waarmee je alsnog een andere zaal kunt gaan tekenen.
     Verdwijnt zodra er een echt startscherm is. */
  vulZaalKiezer() {
    const opties = Model.document.zalen.map(z => {
      const gebouw = Model.gebouw(z.gebouwId);
      return `<option value="${z.id}" ${z.id === this.zaal.id ? "selected" : ""}>
        ${gebouw.naam} / ${z.naam}</option>`;
    }).join("");

    document.getElementById("kruimel").innerHTML = `<select id="kruimelZaal">${opties}</select>`;
    document.getElementById("kruimelZaal").onchange = ev =>
      naarTekenen(Model.opstellingVoorZaal(ev.target.value));
  },

  /* Opnieuw tekenen na elke wijziging. Tijdens het slepen gebeurt dit met opzet
     niet: dan wordt alleen het gesleepte element verplaatst. Zie sleepBeweeg. */
  teken() {
    Tekening.elementen(this.opstelling, this.gElementen, this.geselecteerd);
    this.toonEigenschappen();
    this.toonTelling();
    if (this.opWijziging) this.opWijziging();
  },

  /* ---------------- wat je kunt plaatsen ---------------- */

  vulGereedschap() {
    const balk = document.getElementById("gereedschap");
    const knop = (plaats, meubelId, naam, maat, blokje) =>
      `<button class="tool" data-plaats="${plaats}" data-meubel="${meubelId || ""}">
         <span class="swatch ${blokje}"><i></i></span>${naam}
         ${maat ? `<span class="dim">${maat}</span>` : ""}
       </button>`;

    // het blokje links in de knop volgt de breedte van de tafel
    const blokjeVoorTafel = b => b >= 160 ? "" : b >= 100 ? "md" : "sq";

    const tafels = Model.meubeltypen("tafel").map(m =>
      knop("tafel", m.id, m.korteNaam || m.naam, `${m.breedte}×${m.diepte}`, blokjeVoorTafel(m.breedte))
    ).join("");

    const objecten = Model.meubeltypen("object").map(m =>
      knop("object", m.id, m.naam, "", "obj")
    ).join("");

    balk.innerHTML = `
      <div class="group"><h2>Tafels</h2>${tafels}</div>
      <div class="group"><h2>Stoelen</h2>
        ${knop("rij", "", "Rij", "", "chair")}
        ${knop("kring", "", "Kring", "", "chair")}
        ${knop("stoel", "", "Losse stoel", "", "chair")}
      </div>
      <div class="group"><h2>Objecten</h2>${objecten}</div>`;
  },

  plaats(type, meubelId) {
    this.momentopname();
    const midden = {
      x: Math.round((this.beeld.x + this.beeld.w / 2) / 5) * 5,
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
    return `<div class="field"><label>${label}</label>
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
      vak.innerHTML = `<p class="empty">Kies links iets om te plaatsen.
        Klik daarna op een tafel of stoel om hem aan te passen.</p>`;
      return;
    }

    let titel = "", onder = "", inhoud = "";

    if (e.type === "tafel") {
      const m = Model.meubel(e.meubelId);
      titel = m.naam;
      onder = `${m.breedte} × ${m.diepte} cm`;
      inhoud = `<h2>Stoelen per zijde</h2>
        ${this.teller("Boven",  e.stoelen.boven,  "zijde:boven",  0, 8)}
        ${this.teller("Onder",  e.stoelen.onder,  "zijde:onder",  0, 8)}
        ${this.teller("Links",  e.stoelen.links,  "zijde:links",  0, 8)}
        ${this.teller("Rechts", e.stoelen.rechts, "zijde:rechts", 0, 8)}
        <h2 style="margin-top:20px">Functie</h2>
        <select id="functie">${Object.entries(Model.functies).map(([k, v]) =>
          `<option value="${k}" ${e.functie === k ? "selected" : ""}>${v}</option>`).join("")}</select>`;
    }
    else if (e.type === "rij") {
      titel = "Rij stoelen";
      onder = `${e.n} stoelen`;
      inhoud = this.teller("Aantal", e.n, "aantal", 2, 30);
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
        <h2 style="margin-top:20px">Maat</h2>
        ${this.teller("Aantal", e.n, "aantal", 3, 40)}
        ${this.teller("Opening", e.opening, "opening", 0, 8)}
        ${ovaal
          ? this.teller("Breedte", e.rx * 2, "rx", 140, 1200) + this.teller("Diepte", e.ry * 2, "ry", 140, 1200)
          : this.teller("Doorsnede", e.rx * 2, "rx", 140, 1200)}
        <div class="row"><button class="ghost" data-doe="passend">Passend maken</button></div>`;
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

    vak.innerHTML = `<p class="selname">${titel}</p><p class="selsub">${onder}</p>${inhoud}
      <div class="row">
        <button class="ghost" data-doe="draai-">Draai ↺</button>
        <button class="ghost" data-doe="draai+">Draai ↻</button>
      </div>
      <div class="row">
        <button class="ghost" data-doe="dupliceer">Dupliceren</button>
        <button class="ghost" data-doe="verwijder">Verwijderen</button>
      </div>`;

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
  },

  toonTelling() {
    const regels = Telling.regels(this.opstelling, this.zaal);
    const tekorten = regels.filter(r => r.tekort > 0);

    let html = `<h2>In deze opstelling</h2>` + regels.map(r =>
      `<div class="tline ${r.tekort ? "over" : ""}">
         <span>${r.naam}</span><b>${r.aantal}</b>
       </div>`).join("");

    if (tekorten.length) {
      html += `<p class="note">` + tekorten.map(r =>
        `${r.tekort} ${r.naam.toLowerCase()} meer dan er in deze zaal staan.`
      ).join("<br>") + `<br>Halen uit een andere zaal.</p>`;
    }

    document.getElementById("telling").innerHTML = html;
  },

  /* ---------------- zoomen en verschuiven ---------------- */

  toonBeeld() {
    this.svg.setAttribute("viewBox", `${this.beeld.x} ${this.beeld.y} ${this.beeld.w} ${this.beeld.h}`);
  },

  passend() {
    const k = Tekening.kader(this.zaal), M = 220;
    const zaalB = k.x1 - k.x0 + M * 2, zaalD = k.y1 - k.y0 + M * 2;
    const vak = this.svg.getBoundingClientRect();
    const verhouding = vak.width / vak.height;

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
    this._onGereedschapKlik = ev => {
      const knop = ev.target.closest("[data-plaats]");
      if (knop) this.plaats(knop.dataset.plaats, knop.dataset.meubel || null);
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
    document.getElementById("gereedschap").removeEventListener("click", this._onGereedschapKlik);
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
        const laagst = e.type === "kring" ? 3 : 2;
        const hoogst = e.type === "kring" ? 40 : 30;
        e.n = Math.max(laagst, Math.min(hoogst, e.n + richting));
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
