/* schermen/start.js — scherm 1: het overzicht.

   Links een donkere zijbalk met het zoekveld en de zalen per gebouw, in
   dezelfde volgorde als de map (op `volgorde`). Rechts de gekozen zaal met
   haar opstellingen als kaarten: elke kaart toont de opstelling als kleine
   tekening, gemaakt met dezelfde tekencode als het tekenscherm en het blad
   (geen tweede tekening). De plattegrond is het product, dus het overzicht
   toont tekeningen.

   Bovenaan de zijbalk staat de weekplanning (zie planning.js): per zaal en
   per dag welke opstellingen er een vast moment hebben. Een blok aanklikken
   opent die opstelling, een leeg vak start een nieuwe opstelling in die zaal
   met die dag al ingevuld.

   Een kaart aanklikken gaat naar het tekenscherm; "+ Nieuwe opstelling" maakt
   er een aan, met meteen een vereniging erbij. Zoeken op vereniging toont de
   gevonden opstellingen uit alle zalen, per zaal onder elkaar.

   Dit scherm gebruikt niet de svg-plattegrond van het tekenscherm, maar een
   eigen indeling in #startscherm — zie app.js (toonLayout). */

const SchermStart = {

  zoekterm: "",
  gekozenZaalId: null,  // de zaal die rechts getoond wordt; blijft staan tussen bezoeken
  weergave: "planning", // "planning" (de weekplanning) of "zaal" (de kaarten van de gekozen zaal)
  nieuwIn: null,    // de zaal-id waarvoor het "nieuwe opstelling"-formulier openstaat
  nieuwDag: null,   // de dag die in dat formulier al klaarstaat (na een klik op een leeg vak in de planning)
  bewerkIn: null,   // de opstelling-id waarvoor het wijzig-formulier openstaat

  open() {
    this.zoekterm = "";
    this.nieuwIn = null;
    this.nieuwDag = null;
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
            const actief = !this.zoekterm.trim() && this.weergave === "zaal" && zaal.id === this.gekozenZaalId;
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

    const planningActief = !this.zoekterm.trim() && this.weergave === "planning";
    const planning = `<button class="menuzaal menuplanning${planningActief ? " actief" : ""}" data-kiesplanning="1"
        ${planningActief ? 'aria-current="true"' : ""}>
        <svg class="vormicoon" viewBox="0 0 20 26" aria-hidden="true">
          <rect x="1.5" y="4.5" width="17" height="17" rx="1.5"/><path d="M1.5 10h17M7 10v11.5M12.5 10v11.5M6 2.5v4M14 2.5v4"/></svg>
        <span class="naam">Weekplanning</span>
      </button>`;

    document.getElementById("menuzalen").innerHTML = html ? planning + html :
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
    else if (zaal && this.weergave === "planning") vak.innerHTML = this.planningOverzicht();
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

  /* De weekplanning: het rooster uit planning.js, met daaronder de
     opstellingen die (nog) geen vast moment hebben. */
  planningOverzicht() {
    const zonder = Planning.zonderMoment();
    return `<div class="overzichtkop">
        <div>
          <p class="overzichtgebouw">Vaste momenten van alle opstellingen</p>
          <h1>Weekplanning</h1>
          <p class="roosteruitleg">
            <span><span class="roosterteken eigen"></span>Geboekt</span>
            <span><span class="roosterteken via"></span>Bezet via een samengevoegde zaal</span>
            <span><span class="roosterteken botsing"></span>Botsing</span>
          </p>
        </div>
        <div class="overzichtknoppen">
          <button class="knop" data-afdrukplanning="1">Planning afdrukken</button>
        </div>
      </div>
      <div class="roosterkader">${Planning.rooster()}</div>
      <p class="roostertip">Klik op een leeg vak om daar een nieuwe opstelling te beginnen.</p>
      ${zonder.length ? `<h2 class="zoekzaal">Zonder vast moment</h2>
        <ul class="zondermoment">${zonder.map(o => `<li>
          <button class="kaartnaam" data-opstelling="${o.id}">${Planning.naam(o)}</button>
          <span>${Model.zaal(o.zaalId).naam}</span>
          <button class="tekstknop" data-bewerkin="${o.id}">Moment toevoegen</button>
        </li>`).join("")}</ul>` : ""}`;
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
          <g class="mRuimte"></g><g class="mVast"></g><g class="mElementen"></g><g class="mTeksten"></g>
        </svg>
      </button>
      <div class="kaartinfo">
        <div class="kaarttitel">
          <button class="kaartnaam" data-opstelling="${o.id}">${naam}</button>
          ${o.teControleren ? `<span class="controleerlabel">${WAARSCHUWING_ICOON}Te controleren</span>` : ""}
        </div>
        <p class="kaartmoment">${SchermAfdrukken.momentenRegels(o.gebruiksmomenten)}</p>
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
        ${this.nieuweOpstellingFormulier(this.nieuwDag)}
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
      Tekening.teksten(Model.zaal(o.zaalId), o.elementen, svg.querySelector(".mTeksten"));
    });
  },

  hoofdletter(tekst) {
    return tekst ? tekst[0].toUpperCase() + tekst.slice(1) : "";
  },

  /* ---------------- een nieuwe opstelling aanmaken ---------------- */

  nieuweOpstellingFormulier(voorDag) {
    const opties = Model.document.verenigingen.map(v =>
      `<option value="${v.id}">${v.naam}</option>`).join("");

    return `<div class="startnieuw startformulier">
      <select class="startnieuwselect">
        <option value="">Geen vereniging</option>
        ${opties}
        <option value="__nieuw__">+ Nieuwe vereniging…</option>
      </select>
      <input type="text" class="startnieuwnaam" placeholder="Naam van de nieuwe vereniging" hidden>
      ${this.momentenVelden(voorDag ? [{ dag: voorDag, begin: "", eind: "" }] : [])}
      <button class="ghost" data-aanmaken="1">Aanmaken</button>
      <button class="ghost" data-annuleer="1">Annuleren</button>
    </div>`;
  },

  opstellingAanmaken(zaalId, wrap) {
    const select = wrap.querySelector(".startnieuwselect");
    let verenigingId = select.value || null;
    const momenten = this.momentenUitlezen(wrap);
    if (!momenten) return;

    if (verenigingId === "__nieuw__") {
      const naam = wrap.querySelector(".startnieuwnaam").value.trim();
      if (!naam) { alert("Vul een naam voor de nieuwe vereniging in."); return; }
      verenigingId = Model.nieuweVereniging(naam).id;
    }

    const opstelling = Model.nieuweOpstelling(zaalId, verenigingId, momenten);
    this.nieuwIn = null;
    this.nieuwDag = null;
    if (this.opWijziging) this.opWijziging();
    naarTekenen(opstelling);
  },

  /* ---------------- een opstelling wijzigen of verwijderen ----------------
     Een opstelling heeft geen eigen naam — wat je in de lijst ziet is de
     naam van zijn vereniging. "De naam wijzigen" is dus: een andere
     vereniging koppelen (of loskoppelen). Hier staan ook de verantwoordelijke
     en de vaste gebruiksmomenten (dag, begin- en eindtijd). Aantal
     personen en opmerkingen horen bij scherm 2, dat er nog niet is. */

  dagOpties(huidigeDag) {
    return Model.dagen.map(d =>
      `<option value="${d}" ${huidigeDag === d ? "selected" : ""}>${this.hoofdletter(d)}</option>`).join("");
  },

  /* De vaste momenten als rijtjes (dag · van · tot · ✕), met een knop om er
     een bij te zetten. Geen rijtjes = geen vast moment. Het dagdeel wordt
     niet gevraagd; dat volgt uit de begintijd (Model.dagdeel). Gebruikt door
     het formulier voor een nieuwe opstelling en door het wijzigformulier. */
  momentenVelden(momenten) {
    return `<div class="veld-vol momentenveld">
      <label>Vaste momenten</label>
      <div class="momenten">${momenten.map(m => this.momentRij(m)).join("")}</div>
      <button type="button" class="ghost momenterbij" data-momenterbij="1">+ Moment toevoegen</button>
    </div>`;
  },

  momentRij(m) {
    return `<div class="momentrij">
      <select class="mDag" aria-label="Dag">${this.dagOpties(m.dag)}</select>
      <input type="time" class="mBegin" aria-label="Van" value="${m.begin || ""}">
      <span aria-hidden="true">–</span>
      <input type="time" class="mEind" aria-label="Tot" value="${m.eind || ""}">
      <button type="button" class="ghost momentweg" data-momentweg="1" aria-label="Moment verwijderen">✕</button>
    </div>`;
  },

  /* De ingevulde momenten, of null als er iets niet klopt (er staat dan al
     een melding). */
  momentenUitlezen(wrap) {
    const momenten = [...wrap.querySelectorAll(".momentrij")].map(rij => ({
      dag: rij.querySelector(".mDag").value,
      begin: rij.querySelector(".mBegin").value,
      eind: rij.querySelector(".mEind").value
    }));
    if (momenten.some(m => !m.begin || !m.eind)) {
      alert("Vul bij elk moment een begin- en eindtijd in, of verwijder het moment.");
      return null;
    }
    if (momenten.some(m => m.eind <= m.begin)) {
      alert("De eindtijd van een moment moet na de begintijd liggen.");
      return null;
    }
    return Model.momentenOpVolgorde(momenten);
  },

  opstellingBewerkFormulier(o) {
    const opties = Model.document.verenigingen.map(v =>
      `<option value="${v.id}" ${o.verenigingId === v.id ? "selected" : ""}>${v.naam}</option>`).join("");

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

      ${this.momentenVelden(o.gebruiksmomenten || [])}

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
    const momenten = this.momentenUitlezen(wrap);
    if (!momenten) return;

    if (verenigingId === "__nieuw__") {
      const naam = wrap.querySelector(".startnieuwnaam").value.trim();
      if (!naam) { alert("Vul een naam voor de nieuwe vereniging in."); return; }
      verenigingId = Model.nieuweVereniging(naam).id;
    }

    const verantwoordelijke = wrap.querySelector(".bwVerantwoordelijke").value;

    // alleen bij een echte wijziging telt de datum; Opslaan zonder iets te veranderen niet
    const voor = JSON.stringify([opstelling.verenigingId, opstelling.verantwoordelijke, opstelling.gebruiksmomenten]);
    opstelling.verenigingId = verenigingId;
    opstelling.verantwoordelijke = verantwoordelijke;
    opstelling.gebruiksmomenten = momenten;
    if (JSON.stringify([opstelling.verenigingId, opstelling.verantwoordelijke, opstelling.gebruiksmomenten]) !== voor) {
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
      if (ev.target.closest("[data-kiesplanning]")) {
        this.weergave = "planning";
        this.zoekterm = "";
        document.getElementById("startZoek").value = "";
        this.nieuwIn = null;
        this.bewerkIn = null;
        this.tekenLijst();
        return;
      }

      // een blok in de planning (of een naam in de lijst eronder) opent de opstelling
      const blok = ev.target.closest(".rooster [data-opstelling]");
      if (blok) { naarTekenen(Model.opstelling(blok.dataset.opstelling)); return; }

      // een leeg vak in de planning: een nieuwe opstelling in die zaal, op die dag
      const leeg = ev.target.closest("[data-leegvak]");
      if (leeg) {
        const [zaalId, dag] = leeg.dataset.leegvak.split("|");
        this.gekozenZaalId = zaalId;
        this.weergave = "zaal";
        this.nieuwIn = zaalId;
        this.nieuwDag = dag;
        this.bewerkIn = null;
        this.tekenLijst();
        document.querySelector("#startlijst .nieuwkaart.open")?.scrollIntoView({ block: "center" });
        return;
      }

      // "Moment toevoegen" onder de planning: het wijzigformulier op de kaart in de eigen zaal
      const bewerkIn = ev.target.closest("[data-bewerkin]");
      if (bewerkIn) {
        const o = Model.opstelling(bewerkIn.dataset.bewerkin);
        this.gekozenZaalId = o.zaalId;
        this.weergave = "zaal";
        this.nieuwIn = null;
        this.bewerkIn = o.id;
        this.tekenLijst();
        document.querySelector("#startlijst .bewerkkaart")?.scrollIntoView({ block: "center" });
        return;
      }

      if (ev.target.closest("[data-afdrukplanning]")) { naarAfdrukken({ scope: "planning" }); return; }

      const kies = ev.target.closest("[data-kieszaal]");
      if (kies) {
        this.weergave = "zaal";
        this.gekozenZaalId = kies.dataset.kieszaal;
        this.zoekterm = "";
        document.getElementById("startZoek").value = "";
        this.nieuwIn = null;
        this.bewerkIn = null;
        this.tekenLijst();
        return;
      }

      // momenten bijzetten of weghalen gebeurt rechtstreeks in het formulier,
      // zonder het opnieuw op te bouwen: dan blijft wat al ingevuld is staan
      if (ev.target.closest("[data-momenterbij]")) {
        const lijst = ev.target.closest(".momentenveld").querySelector(".momenten");
        const vorige = lijst.querySelector(".momentrij:last-child .mDag");
        lijst.insertAdjacentHTML("beforeend", this.momentRij({ dag: vorige ? vorige.value : "maandag" }));
        return;
      }
      const momentWeg = ev.target.closest("[data-momentweg]");
      if (momentWeg) { momentWeg.closest(".momentrij").remove(); return; }

      const nieuwKnop = ev.target.closest("[data-nieuwopstelling]");
      if (nieuwKnop) { this.nieuwIn = nieuwKnop.dataset.nieuwopstelling; this.nieuwDag = null; this.tekenLijst(); return; }

      const annuleer = ev.target.closest("[data-annuleer]");
      if (annuleer) { this.nieuwIn = null; this.nieuwDag = null; this.tekenLijst(); return; }

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
