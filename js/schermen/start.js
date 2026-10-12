/* schermen/start.js — scherm 1: het overzicht.

   Links een donkere zijbalk met het zoekveld en de zalen per gebouw, in
   dezelfde volgorde als de map (op `volgorde`). Rechts de gekozen zaal met
   haar opstellingen als kaarten: elke kaart toont de opstelling als kleine
   tekening, gemaakt met dezelfde tekencode als het tekenscherm en het blad
   (geen tweede tekening). De plattegrond is het product, dus het overzicht
   toont tekeningen.

   Een kaart aanklikken gaat naar het tekenscherm; "+ Nieuwe opstelling" maakt
   er een aan, met meteen een vereniging erbij. Zoeken op vereniging toont de
   gevonden opstellingen uit alle zalen, per zaal onder elkaar.

   Dit scherm gebruikt niet de svg-plattegrond van het tekenscherm, maar een
   eigen indeling in #startscherm — zie app.js (toonLayout). */

const SchermStart = {

  zoekterm: "",
  gekozenZaalId: null,  // de zaal die rechts getoond wordt; blijft staan tussen bezoeken
  nieuwIn: null,    // de zaal-id waarvoor het "nieuwe opstelling"-formulier openstaat
  bewerkIn: null,   // de opstelling-id waarvoor het wijzig-formulier openstaat

  open() {
    this.zoekterm = "";
    this.nieuwIn = null;
    this.bewerkIn = null;

    const zalen = this.zalenOpVolgorde();
    if (!Model.zaal(this.gekozenZaalId)) this.gekozenZaalId = zalen.length ? zalen[0].id : null;

    document.getElementById("startscherm").innerHTML = `
      <aside class="menu">
        <div class="menukop">
          <img class="menuzegel" src="img/kerkzegel.png" alt="Zegel van de ${Model.gemeente}">
          <div><b>Zaalboek</b><span>${Model.gemeente}</span></div>
        </div>
        <label class="menulabel" for="startZoek">Zoek op vereniging</label>
        <input type="search" id="startZoek" class="menuzoek" placeholder="Naam van een vereniging">
        <nav class="menuzalen" id="menuzalen" aria-label="Zalen"></nav>
        <div class="menuvoet">
          <button class="menuknop omlijnd" id="startAfdrukken" ${Model.document.opstellingen.length ? "" : "disabled"}>Hele map afdrukken</button>
          <button class="menuknop" id="menuZalen">Zalen inrichten</button>
          <button class="menuknop" id="menuBeheer">Beheer</button>
          <span class="status" data-status role="status"></span>
        </div>
      </aside>
      <div class="overzicht" id="startlijst"></div>`;

    this.tekenLijst();
    this.bedieningAanzetten();
  },

  /* Wordt door app.js ingevuld en aangeroepen na het aanmaken van een
     opstelling of vereniging. */
  opWijziging: null,

  /* Alle zalen: per gebouw, daarbinnen per zaal — de volgorde van de map. */
  zalenOpVolgorde() {
    return Model.document.gebouwen.slice().sort((a, b) => a.volgorde - b.volgorde)
      .flatMap(gebouw => Model.document.zalen
        .filter(z => z.gebouwId === gebouw.id)
        .sort((a, b) => a.volgorde - b.volgorde));
  },

  opstellingenVan(zaal) {
    return Model.document.opstellingen.filter(o => o.zaalId === zaal.id);
  },

  /* Een samengevoegde zaal (een vouwwand open) heet "X + Y". Er is daarvoor
     geen apart gegeven in het document; de naam is de afspraak. */
  isCombinatie(zaal) {
    return zaal.naam.includes(" + ");
  },

  /* ---------------- de zijbalk ---------------- */

  tekenMenu() {
    const html = Model.document.gebouwen.slice()
      .sort((a, b) => a.volgorde - b.volgorde)
      .map(gebouw => {
        const zalen = Model.document.zalen
          .filter(z => z.gebouwId === gebouw.id)
          .sort((a, b) => a.volgorde - b.volgorde)
          .map(zaal => {
            const actief = !this.zoekterm.trim() && zaal.id === this.gekozenZaalId;
            return `<button class="menuzaal${actief ? " actief" : ""}" data-kieszaal="${zaal.id}"
                ${actief ? 'aria-current="true"' : ""}>
              ${this.vormIcoon(zaal)}
              <span class="naam">${zaal.naam}${this.isCombinatie(zaal)
                ? '<span class="schermlezer"> (combinatie)</span>' : ""}</span>
              <span class="aantal">${this.opstellingenVan(zaal).length}</span>
            </button>`;
          }).join("");
        return zalen ? `<h2 class="menugebouw">${gebouw.naam}</h2>${zalen}` : "";
      }).join("");

    document.getElementById("menuzalen").innerHTML = html ||
      `<p class="menuleeg">Nog geen zalen. Kies "Zalen inrichten" om te beginnen.</p>`;
  },

  /* Een klein pictogram van de omtrek van de zaal (20 × 26), uitgerekend uit
     de opgeslagen maten met zaalvorm.js — geen aparte tekeningen. */
  vormIcoon(zaal) {
    const omtrek = Zaalvorm.omtrek(zaal.vorm);
    const k = Zaalvorm.kader(omtrek);
    const marge = Math.max(k.x1 - k.x0, k.y1 - k.y0) * 0.06;
    const viewBox = `${k.x0 - marge} ${k.y0 - marge} ${k.x1 - k.x0 + 2 * marge} ${k.y1 - k.y0 + 2 * marge}`;
    return `<svg class="vormicoon" viewBox="${viewBox}" aria-hidden="true">
      <polygon points="${omtrek.map(p => p.join(",")).join(" ")}" vector-effect="non-scaling-stroke"/></svg>`;
  },

  /* ---------------- het hoofdvlak ---------------- */

  tekenLijst() {
    this.tekenMenu();
    const vak = document.getElementById("startlijst");
    const zoekterm = this.zoekterm.trim().toLowerCase();
    const zaal = Model.zaal(this.gekozenZaalId);

    if (zoekterm) vak.innerHTML = this.zoekresultaten(zoekterm);
    else if (zaal) vak.innerHTML = this.zaalOverzicht(zaal);
    else vak.innerHTML = `<p class="empty">Nog geen zalen. Kies "Zalen inrichten" om te beginnen.</p>`;

    this.tekenMiniaturen();
  },

  zaalOverzicht(zaal) {
    const gebouw = Model.gebouw(zaal.gebouwId);
    const opstellingen = this.opstellingenVan(zaal);
    const kaarten = opstellingen.map(o => this.kaart(o)).join("") + this.nieuwKaart(zaal);

    return `<div class="overzichtkop">
        <div>
          <p class="overzichtgebouw">${gebouw.naam}
            ${this.isCombinatie(zaal) ? '<span class="combinatielabel">Combinatie</span>' : ""}</p>
          <h1>${zaal.naam}</h1>
          <p class="overzichtmaat">${this.maatTekst(zaal)} · ${opstellingen.length}
            ${opstellingen.length === 1 ? "opstelling" : "opstellingen"}</p>
        </div>
        <div class="overzichtknoppen">
          <button class="knop" data-afdrukzaal="${zaal.id}" ${opstellingen.length ? "" : "disabled"}>Deze zaal afdrukken</button>
          <button class="knop accent" data-nieuwopstelling="${zaal.id}">+ Nieuwe opstelling</button>
        </div>
      </div>
      <div class="kaarten">${kaarten}</div>`;
  },

  /* Gevonden opstellingen uit alle zalen, per zaal onder elkaar. */
  zoekresultaten(zoekterm) {
    const blokken = this.zalenOpVolgorde().map(zaal => {
      const gevonden = this.opstellingenVan(zaal).filter(o => {
        const vereniging = o.verenigingId && Model.vereniging(o.verenigingId);
        return vereniging && vereniging.naam.toLowerCase().includes(zoekterm);
      });
      if (!gevonden.length) return "";
      return `<h2 class="zoekzaal">${Model.gebouw(zaal.gebouwId).naam} · ${zaal.naam}</h2>
        <div class="kaarten">${gevonden.map(o => this.kaart(o)).join("")}</div>`;
    }).join("");

    return `<div class="overzichtkop"><div>
        <p class="overzichtgebouw">Zoeken op vereniging</p>
        <h1>Zoekresultaten</h1>
      </div></div>` +
      (blokken || `<p class="empty">Geen opstellingen gevonden voor deze zoekterm.</p>`);
  },

  /* "8,3 × 11,9 m · ca. 98 m²" — de buitenmaat en de oppervlakte van de
     omtrek (bij een L-vorm dus zonder de hap). */
  maatTekst(zaal) {
    const omtrek = Zaalvorm.omtrek(zaal.vorm);
    const k = Zaalvorm.kader(omtrek);
    const meter = cm => (Math.round(cm / 10) / 10).toString().replace(".", ",");
    let dubbel = 0;   // de schoenveterformule: oppervlakte van een veelhoek
    omtrek.forEach((p, i) => {
      const q = omtrek[(i + 1) % omtrek.length];
      dubbel += p[0] * q[1] - q[0] * p[1];
    });
    const m2 = Math.round(Math.abs(dubbel) / 2 / 10000);
    return `${meter(k.x1 - k.x0)} × ${meter(k.y1 - k.y0)} m · ca. ${m2} m²`;
  },

  /* ---------------- een kaart per opstelling ---------------- */

  kaart(o) {
    if (this.bewerkIn === o.id) {
      return `<div class="opstellingkaart bewerkkaart">${this.opstellingBewerkFormulier(o)}</div>`;
    }

    const vereniging = o.verenigingId && Model.vereniging(o.verenigingId);
    const naam = vereniging ? vereniging.naam : "Naamloze opstelling";
    const zaal = Model.zaal(o.zaalId);
    const k = Tekening.kader(zaal);
    const M = 60;
    const viewBox = `${k.x0 - M} ${k.y0 - M} ${k.x1 - k.x0 + 2 * M} ${k.y1 - k.y0 + 2 * M}`;

    return `<div class="opstellingkaart">
      <button class="kaartmini" data-opstelling="${o.id}" aria-label="${naam} openen">
        <svg data-miniatuur="${o.id}" viewBox="${viewBox}" aria-hidden="true">
          <g class="mRuimte"></g><g class="mVast"></g><g class="mElementen"></g>
        </svg>
      </button>
      <div class="kaartinfo">
        <div class="kaarttitel">
          <button class="kaartnaam" data-opstelling="${o.id}">${naam}</button>
          ${o.teControleren ? `<span class="controleerlabel">${WAARSCHUWING_ICOON}Te controleren</span>` : ""}
        </div>
        <p class="kaartmoment">${SchermAfdrukken.momentRegel(o.gebruiksmoment)}</p>
        <p class="kaartaantallen">${this.aantallenTekst(o)}</p>
        ${o.gewijzigdOp ? `<p class="kaartdatum">Gewijzigd ${SchermAfdrukken.datumTekst(o.gewijzigdOp)}</p>` : ""}
        <div class="kaartacties">
          <button data-bewerk="${o.id}">Wijzigen</button>
          <button class="gevaar" data-verwijder="${o.id}">Verwijderen</button>
        </div>
      </div>
    </div>`;
  },

  /* "30 personen · 5 tafels lang · 30 stoelen" — uit dezelfde telling als het
     tekenscherm en het blad. */
  aantallenTekst(o) {
    const per = Telling.aantallen(o);
    const delen = [`${Telling.aantalPersonen(o)} personen`];
    Object.keys(per).sort((a, b) => (a === "stoel" ? -1 : b === "stoel" ? 1 : 0)).forEach(id => {
      const meubel = Model.meubel(id);
      if (!meubel || !per[id]) return;
      const woord = per[id] === 1 ? meubel.naam : (meubel.meervoud || meubel.naam);
      delen.push(`${per[id]} ${woord.toLowerCase()}`);
    });
    return delen.join(" · ");
  },

  nieuwKaart(zaal) {
    if (this.nieuwIn === zaal.id) {
      return `<div class="nieuwkaart open">
        <p class="nieuwtitel">Nieuwe opstelling in zaal ${zaal.naam}</p>
        ${this.nieuweOpstellingFormulier()}
      </div>`;
    }
    return `<button class="nieuwkaart" data-nieuwopstelling="${zaal.id}">
      <span class="plus" aria-hidden="true">+</span>
      <b>Nieuwe opstelling</b>
      <span>in zaal ${zaal.naam}</span>
    </button>`;
  },

  /* De kleine tekeningen: de vloer, de vaste objecten en het meubilair, met
     dezelfde tekencode als het blad. Zonder raster, schaalstok en zaalnaam —
     daarvoor zijn ze te klein. */
  tekenMiniaturen() {
    const los = () => document.createElementNS("http://www.w3.org/2000/svg", "g");
    document.querySelectorAll("#startlijst svg[data-miniatuur]").forEach(svg => {
      const o = Model.opstelling(svg.dataset.miniatuur);
      Tekening.zaal(Model.zaal(o.zaalId), {
        raster: los(), schaalstok: los(), naam: los(),
        ruimte: svg.querySelector(".mRuimte"),
        vast: svg.querySelector(".mVast")
      });
      Tekening.elementen(o, svg.querySelector(".mElementen"), null);
    });
  },

  hoofdletter(tekst) {
    return tekst ? tekst[0].toUpperCase() + tekst.slice(1) : "";
  },

  /* ---------------- een nieuwe opstelling aanmaken ---------------- */

  nieuweOpstellingFormulier() {
    const opties = Model.document.verenigingen.map(v =>
      `<option value="${v.id}">${v.naam}</option>`).join("");

    return `<div class="startnieuw startformulier">
      <select class="startnieuwselect">
        <option value="">Geen vereniging</option>
        ${opties}
        <option value="__nieuw__">+ Nieuwe vereniging…</option>
      </select>
      <input type="text" class="startnieuwnaam" placeholder="Naam van de nieuwe vereniging" hidden>
      <button class="ghost" data-aanmaken="1">Aanmaken</button>
      <button class="ghost" data-annuleer="1">Annuleren</button>
    </div>`;
  },

  opstellingAanmaken(zaalId, wrap) {
    const select = wrap.querySelector(".startnieuwselect");
    let verenigingId = select.value || null;

    if (verenigingId === "__nieuw__") {
      const naam = wrap.querySelector(".startnieuwnaam").value.trim();
      if (!naam) { alert("Vul een naam voor de nieuwe vereniging in."); return; }
      verenigingId = Model.nieuweVereniging(naam).id;
    }

    const opstelling = Model.nieuweOpstelling(zaalId, verenigingId);
    this.nieuwIn = null;
    if (this.opWijziging) this.opWijziging();
    naarTekenen(opstelling);
  },

  /* ---------------- een opstelling wijzigen of verwijderen ----------------
     Een opstelling heeft geen eigen naam — wat je in de lijst ziet is de
     naam van zijn vereniging. "De naam wijzigen" is dus: een andere
     vereniging koppelen (of loskoppelen). Hier staan ook de verantwoordelijke
     en het vaste gebruiksmoment (dag, dagdeel, begin- en eindtijd). Aantal
     personen en opmerkingen horen bij scherm 2, dat er nog niet is. */

  DAGEN: ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"],
  DAGDELEN: ["ochtend", "middag", "avond"],

  dagOpties(huidigeDag) {
    return `<option value="" ${!huidigeDag ? "selected" : ""}>Geen vast moment</option>` +
      this.DAGEN.map(d =>
        `<option value="${d}" ${huidigeDag === d ? "selected" : ""}>${this.hoofdletter(d)}</option>`).join("");
  },

  dagdeelOpties(huidigDagdeel) {
    return `<option value="" ${!huidigDagdeel ? "selected" : ""}>Geen dagdeel</option>` +
      this.DAGDELEN.map(d =>
        `<option value="${d}" ${huidigDagdeel === d ? "selected" : ""}>${this.hoofdletter(d)}</option>`).join("");
  },

  opstellingBewerkFormulier(o) {
    const opties = Model.document.verenigingen.map(v =>
      `<option value="${v.id}" ${o.verenigingId === v.id ? "selected" : ""}>${v.naam}</option>`).join("");
    const m = o.gebruiksmoment || {};

    return `<div class="startbewerk startformulier">
      <div class="veld-vol">
        <label>Vereniging</label>
        <select class="startnieuwselect">
          <option value="" ${!o.verenigingId ? "selected" : ""}>Geen vereniging</option>
          ${opties}
          <option value="__nieuw__">+ Nieuwe vereniging…</option>
        </select>
      </div>
      <input type="text" class="startnieuwnaam" placeholder="Naam van de nieuwe vereniging" hidden>

      <div class="veld-vol">
        <label>Verantwoordelijke</label>
        <select class="bwVerantwoordelijke">${Object.entries(Model.verantwoordelijkheden).map(([k, v]) =>
          `<option value="${k}" ${o.verantwoordelijke === k ? "selected" : ""}>${v}</option>`).join("")}</select>
      </div>

      <div class="veld-vol">
        <label>Dag</label>
        <select class="bwDag">${this.dagOpties(m.dag)}</select>
      </div>
      <div class="veld-vol">
        <label>Dagdeel</label>
        <select class="bwDagdeel">${this.dagdeelOpties(m.dagdeel)}</select>
      </div>
      <div class="veld-vol"><label>Van</label><input type="time" class="bwBegin" value="${m.begin || ""}"></div>
      <div class="veld-vol"><label>Tot</label><input type="time" class="bwEind" value="${m.eind || ""}"></div>

      <div class="row">
        <button class="ghost" data-opslaan="${o.id}">Opslaan</button>
        <button class="ghost" data-annuleerbewerk="${o.id}">Annuleren</button>
      </div>
    </div>`;
  },

  opstellingBewerken(id, wrap) {
    const opstelling = Model.opstelling(id);
    const select = wrap.querySelector(".startnieuwselect");
    let verenigingId = select.value || null;

    if (verenigingId === "__nieuw__") {
      const naam = wrap.querySelector(".startnieuwnaam").value.trim();
      if (!naam) { alert("Vul een naam voor de nieuwe vereniging in."); return; }
      verenigingId = Model.nieuweVereniging(naam).id;
    }

    const verantwoordelijke = wrap.querySelector(".bwVerantwoordelijke").value;
    const dag = wrap.querySelector(".bwDag").value;
    const dagdeel = wrap.querySelector(".bwDagdeel").value;
    const begin = wrap.querySelector(".bwBegin").value;
    const eind = wrap.querySelector(".bwEind").value;

    if (dag && (!begin || !eind)) {
      alert("Vul een begin- en eindtijd in bij een vast gebruiksmoment.");
      return;
    }

    // alleen bij een echte wijziging telt de datum; Opslaan zonder iets te veranderen niet
    const voor = JSON.stringify([opstelling.verenigingId, opstelling.verantwoordelijke, opstelling.gebruiksmoment]);
    opstelling.verenigingId = verenigingId;
    opstelling.verantwoordelijke = verantwoordelijke;
    opstelling.gebruiksmoment = dag ? { dag, dagdeel: dagdeel || null, begin, eind } : null;
    if (JSON.stringify([opstelling.verenigingId, opstelling.verantwoordelijke, opstelling.gebruiksmoment]) !== voor) {
      Model.opstellingGewijzigd(opstelling);
    }

    this.bewerkIn = null;
    if (this.opWijziging) this.opWijziging();
    this.tekenLijst();
  },

  opstellingVerwijderen(id) {
    const opstelling = Model.opstelling(id);
    const vereniging = opstelling.verenigingId && Model.vereniging(opstelling.verenigingId);
    const naam = vereniging ? `de opstelling van "${vereniging.naam}"` : "deze naamloze opstelling";
    if (!confirm(`Wil je ${naam} verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;

    Model.document.opstellingen = Model.document.opstellingen.filter(x => x !== opstelling);
    if (this.opWijziging) this.opWijziging();
    this.tekenLijst();
  },

  /* ---------------- knoppen en zoekveld ---------------- */

  bedieningAanzetten() {
    this._onKlik = ev => {
      const kies = ev.target.closest("[data-kieszaal]");
      if (kies) {
        this.gekozenZaalId = kies.dataset.kieszaal;
        this.zoekterm = "";
        document.getElementById("startZoek").value = "";
        this.nieuwIn = null;
        this.bewerkIn = null;
        this.tekenLijst();
        return;
      }

      const nieuwKnop = ev.target.closest("[data-nieuwopstelling]");
      if (nieuwKnop) { this.nieuwIn = nieuwKnop.dataset.nieuwopstelling; this.tekenLijst(); return; }

      const annuleer = ev.target.closest("[data-annuleer]");
      if (annuleer) { this.nieuwIn = null; this.tekenLijst(); return; }

      const aanmaken = ev.target.closest("[data-aanmaken]");
      if (aanmaken) { this.opstellingAanmaken(this.nieuwIn, aanmaken.closest(".startformulier")); return; }

      const bewerk = ev.target.closest("[data-bewerk]");
      if (bewerk) { this.bewerkIn = bewerk.dataset.bewerk; this.tekenLijst(); return; }

      const annuleerBewerk = ev.target.closest("[data-annuleerbewerk]");
      if (annuleerBewerk) { this.bewerkIn = null; this.tekenLijst(); return; }

      const opslaan = ev.target.closest("[data-opslaan]");
      if (opslaan) { this.opstellingBewerken(opslaan.dataset.opslaan, opslaan.closest(".startformulier")); return; }

      const verwijder = ev.target.closest("[data-verwijder]");
      if (verwijder) { this.opstellingVerwijderen(verwijder.dataset.verwijder); return; }

      const afdrukZaal = ev.target.closest("[data-afdrukzaal]");
      if (afdrukZaal) { naarAfdrukken({ scope: "zaal", zaal: Model.zaal(afdrukZaal.dataset.afdrukzaal) }); return; }

      if (ev.target.closest("#startAfdrukken")) { naarAfdrukken({ scope: "alles" }); return; }
      if (ev.target.closest("#menuZalen")) { naarZalenInrichten(); return; }
      if (ev.target.closest("#menuBeheer")) { naarBeheer(); return; }

      const kaart = ev.target.closest("[data-opstelling]");
      if (kaart) naarTekenen(Model.opstelling(kaart.dataset.opstelling));
    };
    document.getElementById("startscherm").addEventListener("click", this._onKlik);

    this._onChange = ev => {
      if (!ev.target.classList.contains("startnieuwselect")) return;
      const wrap = ev.target.closest(".startformulier");
      wrap.querySelector(".startnieuwnaam").hidden = ev.target.value !== "__nieuw__";
    };
    document.getElementById("startscherm").addEventListener("change", this._onChange);

    // los gebonden, niet via tekenLijst(): het veld zelf wordt nooit opnieuw
    // aangemaakt, anders raak je de cursor kwijt bij elke toetsaanslag
    this._onZoek = ev => { this.zoekterm = ev.target.value; this.tekenLijst(); };
    document.getElementById("startZoek").addEventListener("input", this._onZoek);
  },

  /* Aangeroepen door app.js vlak voordat een ander scherm opent. */
  sluiten() {
    document.getElementById("startscherm").removeEventListener("click", this._onKlik);
    document.getElementById("startscherm").removeEventListener("change", this._onChange);
    document.getElementById("startZoek").removeEventListener("input", this._onZoek);
  }
};
