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
       symbolen staan in vormen.js. */
    meubeltypen: [
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
  gebruik(doc) { this.document = doc; },

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
    throw new Error("Onbekend soort element: " + type);
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

  /* Zolang scherm 1 (het startscherm) er nog niet is, moet het tekenscherm
     ook een zaal kunnen tonen die nog geen opstelling heeft — vandaar dit:
     de eerste opstelling van de zaal, of een kale nieuwe als die er nog niet
     is. Bewust zonder vereniging: die koppeling hoort bij scherm 1/5, niet
     bij dit tijdelijke bruggetje. */
  opstellingVoorZaal(zaalId) {
    let opstelling = this.document.opstellingen.find(o => o.zaalId === zaalId);
    if (!opstelling) {
      const id = this.uniekeId(`${zaalId}-opstelling`, this.document.opstellingen.map(o => o.id));
      opstelling = {
        id, zaalId, verenigingId: null,
        aantalPersonen: 0, aantalPersonenHandmatig: false,
        gebruiksmoment: null, verantwoordelijke: "koster", opmerkingen: "",
        gewijzigdOp: new Date().toISOString().slice(0, 10),
        teControleren: false, elementen: []
      };
      this.document.opstellingen.push(opstelling);
    }
    return opstelling;
  }
};
