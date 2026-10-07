/* model.js — het document met alle gegevens, en het opzoeken erin.

   In deze stap staat het document nog in dit bestand. In stap 1b wordt het
   opgehaald bij GitHub en verandert er verder niets: de rest van de applicatie
   praat alleen via de opzoekfuncties onderaan met de gegevens.

   Alle maten zijn hele centimeters. Alle sleutels zijn Nederlands. */

const Model = {

  /* Het document waarmee gewerkt wordt. Het komt van opslag.js; tot die het
     geladen heeft, is er niets. */
  document: null,

  /* De voorbeeldzaal. Die wordt alleen gebruikt als het bewaarde document nog
     leeg is, zodat er bij de eerste keer openen iets te tekenen valt. Vanaf
     bouwstap 2 voer je je eigen zalen in en verdwijnt hij vanzelf. */
  voorbeeld: {
    versie: 1,

    gebouwen: [
      { id: "verenigingsgebouw", naam: "Verenigingsgebouw", volgorde: 1 }
    ],

    /* De soort bepaalt waar iets terechtkomt in de lijst links.
       Bij een object bepaalt het symbool hoe het getekend wordt; de namen van de
       symbolen staan in vormen.js.

       Een tafel is rechthoekig, tenzij er `vorm: "trapezium"` bij staat. Dan is
       `breedte` de lange zijde, `korteZijde` de korte, en `diepte` de afstand
       daartussen. Die drie maten bepalen hoe schuin de tafel toeloopt en dus
       hoeveel er in een kring passen; zie tafelkring.js. */
    meubeltypen: [
      { id: "tafel-kerk",      soort: "tafel", naam: "Tafel kerkzaal",  breedte: 120, diepte: 60, korteNaam: "Kerk",      meervoud: "Tafels kerkzaal" },
      { id: "tafel-visnet",    soort: "tafel", naam: "Tafel 't Visnet", breedte: 120, diepte: 80, korteNaam: "Visnet",    meervoud: "Tafels 't Visnet" },
      { id: "tafel-trapezium", soort: "tafel", naam: "Trapeziumtafel",  breedte: 160, diepte: 69, korteNaam: "Trapezium", meervoud: "Trapeziumtafels",
        vorm: "trapezium", korteZijde: 80 },

      { id: "t180",       soort: "tafel",  naam: "Tafel lang",     breedte: 180, diepte: 80, korteNaam: "Lang",     meervoud: "Tafels lang" },
      { id: "t120",       soort: "tafel",  naam: "Tafel kort",     breedte: 120, diepte: 80, korteNaam: "Kort",     meervoud: "Tafels kort" },
      { id: "t80",        soort: "tafel",  naam: "Tafel vierkant", breedte:  80, diepte: 80, korteNaam: "Vierkant", meervoud: "Tafels vierkant" },
      { id: "stoel",      soort: "stoel",  naam: "Stoel",          breedte:  45, diepte: 45, meervoud: "Stoelen" },
      { id: "smartboard", soort: "object", naam: "Smartboard",     breedte: 175, diepte: 70, symbool: "bordDonker" },
      { id: "whiteboard", soort: "object", naam: "Whiteboard",     breedte: 150, diepte: 60, symbool: "bordLicht" },
      { id: "piano",      soort: "object", naam: "Piano",          breedte: 148, diepte: 64, symbool: "klavier" },
      { id: "orgel",      soort: "object", naam: "Orgel",          breedte: 112, diepte: 56, symbool: "klavierOrgel" }
    ],

    zalen: [
      {
        id: "vg-grote-zaal",
        gebouwId: "verenigingsgebouw",
        naam: "Grote zaal",
        volgorde: 1,
        vorm: { type: "l-vorm", breedte: 1000, diepte: 1000,
                hoek: "rechtsonder", hapBreedte: 400, hapDiepte: 400 },
        vasteObjecten: [
          { soort: "raam",     x: 250, y:   0, breedte: 200, diepte: 16, hoek:  0 },
          { soort: "raam",     x: 520, y:   0, breedte: 200, diepte: 16, hoek:  0 },
          { soort: "raam",     x: 790, y:   0, breedte: 180, diepte: 16, hoek:  0 },
          { soort: "raam",     x:   0, y: 760, breedte: 180, diepte: 16, hoek: 90 },
          { soort: "keuken",   x: 210, y: 968, breedte: 300, diepte: 64, hoek:  0, opschrift: "Keuken" },
          { soort: "uitgifte", x: 470, y: 978, breedte: 130, diepte: 44, hoek:  0, opschrift: "Uitgifte" },
          { soort: "kast",     x: 966, y: 400, breedte: 200, diepte: 56, hoek: 90, opschrift: "Kast" },
          { soort: "scherm",   x: 800, y: 607, breedte: 220, diepte: 14, hoek:  0, opschrift: "Beamerscherm" },
          { soort: "deur",     x:   0, y: 800, breedte:  95, hoek: 90, kant: -1 },
          { soort: "deur",     x:1000, y: 180, breedte:  95, hoek: 90, kant:  1 }
        ],
        voorraad: { t180: 10, t120: 6, t80: 4, stoel: 40,
                    smartboard: 1, whiteboard: 1, piano: 1, orgel: 0 }
      }
    ],

    verenigingen: [
      { id: "zangvereniging", naam: "Zangvereniging" }
    ],

    /* Eén voorbeeldopstelling, dezelfde als in het prototype, zodat er meteen
       iets te zien is en het beeld met het prototype vergeleken kan worden. */
    opstellingen: [
      {
        id: "zang-dinsdagavond",
        zaalId: "vg-grote-zaal",
        verenigingId: "zangvereniging",
        aantalPersonen: 24,
        aantalPersonenHandmatig: false,
        gebruiksmoment: { dag: "dinsdag", dagdeel: "avond", begin: "20:00", eind: "22:00" },
        verantwoordelijke: "koster",
        opmerkingen: "",
        gewijzigdOp: "2026-09-03",
        teControleren: false,
        elementen: [
          { type: "tafel", meubelId: "t180", x: 300, y: 250, hoek: 0,
            stoelen: { boven: 3, onder: 3, links: 0, rechts: 0 }, functie: "geen" },
          { type: "tafel", meubelId: "t180", x: 300, y: 420, hoek: 0,
            stoelen: { boven: 3, onder: 3, links: 0, rechts: 0 }, functie: "geen" },
          { type: "tafel", meubelId: "t120", x: 820, y: 430, hoek: 0,
            stoelen: { boven: 0, onder: 0, links: 0, rechts: 0 }, functie: "koffie" },
          { type: "tafel", meubelId: "t180", x: 300, y: 820, hoek: 0,
            stoelen: { boven: 0, onder: 0, links: 0, rechts: 0 }, functie: "eten" },
          { type: "tafel", meubelId: "t120", x: 300, y: 110, hoek: 0,
            stoelen: { boven: 0, onder: 0, links: 0, rechts: 0 }, functie: "spreek" },
          { type: "rij", n: 5, x: 700, y: 180, hoek: 0 },
          { type: "object", meubelId: "piano", x: 850, y: 820, hoek: 270 },
          { type: "object", meubelId: "smartboard", x: 790, y: 660, hoek: 180 },
          { type: "kring", n: 12, opening: 3, vorm: "ovaal", rx: 230, ry: 150,
            x: 250, y: 560, hoek: 180 }
        ]
      }
    ]
  },

  /* Een geladen document in gebruik nemen. */
  gebruik(doc) {
    this.document = doc;
    this.meubeltypenAanvullen();
    this.tafelkringenRepareren();
  },

  /* Tijdelijk bruggetje. Een document dat al bewaard is, kent de meubeltypen
     nog niet die later zijn bijgekomen — er is immers nog geen scherm waarin je
     ze zelf toevoegt. Ontbrekende typen worden daarom aangevuld uit de
     voorbeeldlijst hierboven, op id.

     Gevolg zolang dit erin zit: een meubeltype dat je zou wissen, komt bij de
     volgende keer openen terug. Deze functie vervalt zodra scherm 7 (meubilair
     beheren) er is; dan voeg je zelf toe en moet wissen ook echt wissen. */
  meubeltypenAanvullen() {
    if (!this.document.meubeltypen) this.document.meubeltypen = [];
    const aanwezig = this.document.meubeltypen.map(m => m.id);
    this.voorbeeld.meubeltypen
      .filter(m => !aanwezig.includes(m.id))
      .forEach(m => this.document.meubeltypen.push(JSON.parse(JSON.stringify(m))));
  },

  /* Een tafelkring-element van vóór dit schema had alleen `n`: een gesloten
     lus van n trapeziumtafels, zonder rechte tafels ertussen. Zonder `zijden`
     loopt het eigenschappenpaneel in schermen/tekenen.js vast zodra zo'n
     tafelkring aangeklikt wordt — je kunt hem dan niet eens meer verwijderen.
     Dit vult de ontbrekende velden aan met het equivalent in het huidige
     schema: dezelfde gesloten lus, nu met een lege `zijden`-rij. */
  tafelkringenRepareren() {
    this.document.opstellingen.forEach(opstelling => {
      opstelling.elementen.forEach(element => {
        if (element.type !== "tafelkring" || element.zijden) return;
        const bochtTafel = this.meubel(element.meubelId);
        const rechte = this.meubeltypen("tafel").find(m => m.vorm !== "trapezium");
        element.zijden = new Array(Tafelkring.aantalZijden(bochtTafel)).fill(0);
        element.weggelaten = [];
        element.rechteMeubelId = rechte ? rechte.id : null;
        delete element.n;
      });
    });
  },

  /* Een pas aangemaakt bestand bevat alleen { "versie": 1 }. */
  isLeeg(doc) { return !doc || !doc.zalen || doc.zalen.length === 0; },

  /* De tekst zoals hij bij GitHub bewaard wordt. Met inspringing, zodat het
     document met het blote oog te lezen blijft. */
  alsTekst() { return JSON.stringify(this.document, null, 2); },

  /* De functies die een tafel kan hebben. */
  functies: {
    geen:   "Geen",
    koffie: "Koffie en thee",
    eten:   "Eten of buffet",
    spreek: "Spreektafel"
  },

  /* Wie verantwoordelijk is voor het klaarzetten van een opstelling. Bewust
     een rol, geen naam met telefoonnummer: een naam veroudert bij een
     bestuurswisseling, een rol niet. */
  verantwoordelijkheden: {
    koster:     "Koster",
    vereniging: "De vereniging zelf",
    vorige:     "De vereniging die ervoor zat"
  },

  /* ---------- opzoeken ---------- */

  gebouw(id)      { return this.document.gebouwen.find(g => g.id === id); },
  zaal(id)        { return this.document.zalen.find(z => z.id === id); },
  vereniging(id)  { return this.document.verenigingen.find(v => v.id === id); },
  opstelling(id)  { return this.document.opstellingen.find(o => o.id === id); },
  meubel(id)      { return this.document.meubeltypen.find(m => m.id === id); },

  meubeltypen(soort) {
    return this.document.meubeltypen.filter(m => m.soort === soort);
  },

  /* ---------- nieuwe elementen ----------
     Eén plek waar vastligt hoe een pas geplaatst element eruitziet. */
  nieuwElement(type, meubelId, x, y) {
    const basis = { type, x, y, hoek: 0 };

    if (type === "tafel") {
      return Object.assign(basis, {
        meubelId,
        stoelen: { boven: 0, onder: 0, links: 0, rechts: 0 },
        functie: "geen"
      });
    }
    if (type === "rij")    return Object.assign(basis, { n: 6 });
    if (type === "stoel")  return basis;
    if (type === "object") return Object.assign(basis, { meubelId });
    if (type === "kring") {
      const kring = Object.assign(basis, { n: 10, opening: 0, vorm: "rond", rx: 100, ry: 100 });
      Kring.passendMaken(kring);
      return kring;
    }
    if (type === "tafelkring") {
      /* De maat wordt niet bewaard: die volgt uit de tafels zelf. Wat je wél
         kiest, staat hier: hoeveel rechte tafels er per paar tegenover elkaar
         liggende zijden bij komen, en welke plaatsen leeg blijven. */
      const bochtTafel = this.meubel(meubelId);
      const rechte = this.meubeltypen("tafel").find(m => m.vorm !== "trapezium");
      return Object.assign(basis, {
        meubelId,
        rechteMeubelId: rechte ? rechte.id : null,
        zijden: new Array(Tafelkring.aantalZijden(bochtTafel)).fill(0),
        weggelaten: [],
        stoelen: 2
      });
    }
    throw new Error("Onbekend soort element: " + type);
  },

  /* ---------- vaste objecten van een zaal ----------
     Net als bij nieuwElement: één plek met de standaardmaten van een vast
     object. Een deur heeft geen `diepte`: Vormen.deur tekent een vaste
     hoogte, alleen de breedte telt. */
  vasteObjectSoorten: {
    deur: { naam: "Deur", breedte:  95 },
    raam: { naam: "Raam", breedte: 150, diepte: 16 },
    kast: { naam: "Kast", breedte: 120, diepte: 50, opschrift: "Kast" }
  },

  nieuwVastObject(soort, x, y) {
    const basis = this.vasteObjectSoorten[soort];
    if (!basis) throw new Error("Onbekend soort vast object: " + soort);

    const object = { soort, x, y, breedte: basis.breedte, hoek: 0 };
    if (basis.diepte != null)    object.diepte = basis.diepte;
    if (basis.opschrift != null) object.opschrift = basis.opschrift;
    if (soort === "deur")        object.kant = 1;
    return object;
  },

  /* ---------- gebouwen en zalen aanmaken ----------
     Gebruikt door het zaal-inrichtscherm (scherm 6). Een leesbare sleutel
     afgeleid van de naam, zodat het document met het blote oog te volgen
     blijft; bij een botsing komt er een cijfer achteraan. */

  slug(tekst) {
    const basis = tekst.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // accenten weg
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return basis || "zaal";
  },

  uniekeId(voorstel, bestaandeIds) {
    if (!bestaandeIds.includes(voorstel)) return voorstel;
    let i = 2;
    while (bestaandeIds.includes(`${voorstel}-${i}`)) i++;
    return `${voorstel}-${i}`;
  },

  nieuwGebouw(naam) {
    const id = this.uniekeId(this.slug(naam), this.document.gebouwen.map(g => g.id));
    const gebouw = { id, naam, volgorde: this.document.gebouwen.length + 1 };
    this.document.gebouwen.push(gebouw);
    return gebouw;
  },

  nieuweZaal(gebouwId, naam, vorm) {
    const voorstel = `${gebouwId}-${this.slug(naam)}`;
    const id = this.uniekeId(voorstel, this.document.zalen.map(z => z.id));
    const volgorde = this.document.zalen.filter(z => z.gebouwId === gebouwId).length + 1;
    const zaal = { id, gebouwId, naam, volgorde, vorm, vasteObjecten: [], voorraad: {} };
    this.document.zalen.push(zaal);
    return zaal;
  },

  nieuweVereniging(naam) {
    const id = this.uniekeId(this.slug(naam), this.document.verenigingen.map(v => v.id));
    const vereniging = { id, naam };
    this.document.verenigingen.push(vereniging);
    return vereniging;
  },

  /* Gebruikt door het startscherm (scherm 1) om een nieuwe, lege opstelling
     voor een zaal aan te maken. De koster kiest de vereniging al bij het
     aanmaken; de rest (gebruiksmoment, opmerkingen) vult hij later in. */
  nieuweOpstelling(zaalId, verenigingId) {
    const id = this.uniekeId(`${zaalId}-opstelling`, this.document.opstellingen.map(o => o.id));
    const opstelling = {
      id, zaalId, verenigingId: verenigingId || null,
      aantalPersonen: 0, aantalPersonenHandmatig: false,
      gebruiksmoment: null, verantwoordelijke: "koster", opmerkingen: "",
      gewijzigdOp: new Date().toISOString().slice(0, 10),
      teControleren: false, elementen: []
    };
    this.document.opstellingen.push(opstelling);
    return opstelling;
  }
};
