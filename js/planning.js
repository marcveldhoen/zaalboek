/* planning.js — de weekplanning: welke zaal wanneer bezet is.

   Niets hiervan wordt bewaard. De planning wordt elke keer opnieuw
   uitgerekend uit de vaste momenten van de opstellingen
   (`gebruiksmomenten`), zodat ze nooit iets anders kan zeggen dan de
   opstellingen zelf. Het overzicht (schermen/start.js) en het afdrukblad
   (schermen/afdrukken.js) gebruiken allebei het rooster hieronder — net als
   bij de tekening: één bron, één tekencode.

   Een samengevoegde zaal heet "X + Y" (zie SchermStart.isCombinatie). Is
   die bezet, dan zijn X en Y dat in werkelijkheid ook, en andersom. Zo'n
   doorgerekende bezetting heet hieronder "via". Overlappen twee boekingen in
   tijd in dezelfde ruimte, dan is dat een botsing. */

const Planning = {

  /* De ruimtes waaruit een zaal bestaat: bij "Groot + Klein" de namen Groot
     en Klein, bij een gewone zaal alleen haar eigen naam. */
  ruimtes(zaal) {
    return zaal.naam.split(" + ").map(n => n.trim());
  },

  /* Delen twee zalen (in hetzelfde gebouw) een ruimte? Dan kan er niet
     tegelijk in allebei iets gebeuren. */
  overlappen(a, b) {
    if (a.gebouwId !== b.gebouwId) return false;
    const ruimtesB = this.ruimtes(b);
    return this.ruimtes(a).some(r => ruimtesB.includes(r));
  },

  /* Overlappen twee momenten in tijd? Aansluitend (18:00–20:00 en
     20:00–22:00) telt niet als overlap. */
  tegelijk(m1, m2) {
    return m1.dag === m2.dag && m1.begin < m2.eind && m2.begin < m1.eind;
  },

  /* Per zaal-id een rij van zeven dagen (0 = maandag), met in elk vak de
     blokken op volgorde van begintijd:
     { opstelling, moment, soort: "eigen" | "via", viaZaal, botsing } */
  week() {
    const zalen = Model.document.zalen;
    const week = {};

    zalen.forEach(zaal => {
      const dagen = Model.dagen.map(() => []);
      Model.document.opstellingen.forEach(opstelling => {
        const zaalVan = Model.zaal(opstelling.zaalId);
        if (!zaalVan) return;
        const eigen = zaalVan.id === zaal.id;
        if (!eigen && !this.overlappen(zaal, zaalVan)) return;
        (opstelling.gebruiksmomenten || []).forEach(moment => {
          const dag = Model.dagen.indexOf(moment.dag);
          if (dag < 0) return;
          dagen[dag].push({
            opstelling, moment,
            soort: eigen ? "eigen" : "via",
            viaZaal: eigen ? null : zaalVan,
            botsing: false
          });
        });
      });

      dagen.forEach(blokken => {
        blokken.sort((a, b) => a.moment.begin.localeCompare(b.moment.begin));
        blokken.forEach(blok => {
          blok.botsing = blokken.some(ander => ander !== blok && this.tegelijk(blok.moment, ander.moment));
        });
      });
      week[zaal.id] = dagen;
    });
    return week;
  },

  /* Opstellingen zonder vast moment: die staan niet in het rooster, dus
     worden ze eronder genoemd, zodat ze niet stil verdwijnen. */
  zonderMoment() {
    return Model.document.opstellingen.filter(o =>
      !(o.gebruiksmomenten && o.gebruiksmomenten.length));
  },

  naam(opstelling) {
    const vereniging = opstelling.verenigingId && Model.vereniging(opstelling.verenigingId);
    return vereniging ? vereniging.naam : "Naamloze opstelling";
  },

  /* Het rooster als tabel: kolommen maandag t/m zondag, per gebouw een
     tussenkop en per zaal een rij. Op het scherm zijn de blokken en de lege
     vakken aan te klikken (data-opstelling, data-leegvak); met
     { afdruk: true } niet. */
  rooster(opties = {}) {
    const afdruk = !!opties.afdruk;
    const week = this.week();
    const weekend = dag => dag >= 5 ? " weekend" : "";

    const kop = `<tr><th class="roosterzaal" scope="col"><span class="schermlezer">Zaal</span></th>${
      Model.dagen.map((d, i) => `<th scope="col" class="${weekend(i).trim()}">${SchermStart.hoofdletter(d)}</th>`).join("")}</tr>`;

    const rijen = Model.document.gebouwen.slice().sort((a, b) => a.volgorde - b.volgorde)
      .map(gebouw => {
        const zalen = Model.document.zalen
          .filter(z => z.gebouwId === gebouw.id)
          .sort((a, b) => a.volgorde - b.volgorde);
        if (!zalen.length) return "";
        return `<tr class="roostergebouw"><th colspan="8" scope="colgroup">${gebouw.naam}</th></tr>` +
          zalen.map(zaal => `<tr>
            <th class="roosterzaal" scope="row">${zaal.naam}</th>
            ${week[zaal.id].map((blokken, dag) => `<td class="roostervak${weekend(dag)}"${
              afdruk ? "" : ` data-leegvak="${zaal.id}|${Model.dagen[dag]}" title="Nieuwe opstelling in ${zaal.naam} op ${Model.dagen[dag]}"`}>${
              blokken.map(blok => this.blokHtml(blok, afdruk)).join("")}</td>`).join("")}
          </tr>`).join("");
      }).join("");

    return `<table class="rooster${afdruk ? " roosterafdruk" : ""}">
      <thead>${kop}</thead><tbody>${rijen}</tbody></table>`;
  },

  blokHtml(blok, afdruk) {
    const m = blok.moment;
    const klassen = ["roosterblok", blok.soort === "via" ? "via" : "", blok.botsing ? "botsing" : ""]
      .filter(Boolean).join(" ");
    const via = blok.soort === "via" ? `<span class="roostervia">bezet via ${blok.viaZaal.naam}</span>` : "";
    const botsing = blok.botsing ? `${WAARSCHUWING_ICOON}<span class="schermlezer">Botsing: </span>` : "";
    const inhoud = `<span class="roostertijd">${botsing}${m.begin}–${m.eind}</span>
      <span class="roosternaam">${this.naam(blok.opstelling)}</span>${via}`;
    return afdruk
      ? `<div class="${klassen}">${inhoud}</div>`
      : `<button class="${klassen}" data-opstelling="${blok.opstelling.id}">${inhoud}</button>`;
  }
};
