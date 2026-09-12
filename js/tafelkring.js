/* tafelkring.js — waar de tafels in een kring komen te staan.

   Dit is het tegenovergestelde van kring.js. Bij stoelen kies je de maat van de
   kring en worden de stoelen daarover verdeeld. Bij tafels kan dat niet: een
   trapeziumtafel heeft een vaste vorm, dus het aantal tafels bepaalt hoe groot
   de kring wordt. Je kunt er alleen tafels bij of af doen.

   De tafels staan met de lange zijde naar buiten en de korte naar het midden.
   Alle maten in hele centimeters, hoeken in graden. */

const Tafelkring = {

  /* De korte zijde van een trapezium. Een rechthoekige tafel heeft er geen,
     dan zijn beide zijden even lang. */
  korteZijde(meubel) {
    return meubel.korteZijde || meubel.breedte;
  },

  /* Hoeveel graden van de kring één tafel inneemt.

     De schuine zijden van een trapezium wijzen naar één punt: het midden van de
     kring. Hoe sneller de tafel toeloopt, hoe groter de hoek en hoe minder
     tafels er in een rondje passen. Bij een rechthoekige tafel lopen de zijden
     evenwijdig; dan is er geen natuurlijke hoek en geeft deze functie 0.

     De helft van het verschil tussen de lange en de korte zijde, gedeeld door
     de diepte, is de tangens van de halve hoek. Een halve zeshoek (160/80/69)
     komt zo precies op 60 graden uit: zes tafels sluiten dan rond. */
  tafelhoek(meubel) {
    const verschil = meubel.breedte - this.korteZijde(meubel);
    if (verschil <= 0 || !meubel.diepte) return 0;
    return 2 * Math.atan(verschil / (2 * meubel.diepte)) * 180 / Math.PI;
  },

  /* Het grootste aantal tafels dat nog in een rondje past. Naar beneden
     afgerond: één tafel te veel zou de kring moeten oprekken, en dan ontstaan
     er juist aan de binnenkant kieren. */
  passendAantal(meubel) {
    const hoek = this.tafelhoek(meubel);
    if (!hoek) return 8;
    return Math.max(3, Math.min(16, Math.floor(360 / hoek)));
  },

  /* De afstand van het midden van de kring tot de lange zijde van de tafels.

     Twee dingen mogen elkaar niet raken: de lange zijden aan de buitenkant en
     de korte zijden aan de binnenkant. Welke van de twee knelt hangt af van het
     aantal tafels, dus we nemen de grootste van beide. Zo staat de kring altijd
     zo krap als kan zonder dat tafels over elkaar heen vallen. */
  speling: 2,   // cm lucht tussen twee tafels, zodat ze elkaar net niet raken

  straal(meubel, n) {
    const halveHoek = Math.PI / Math.max(3, n);
    const buitenkant = (meubel.breedte / 2 + this.speling) / Math.tan(halveHoek);
    const binnenkant = meubel.diepte +
      (this.korteZijde(meubel) / 2 + this.speling) / Math.tan(halveHoek);
    return Math.ceil(Math.max(buitenkant, binnenkant));
  },

  /* Waar het midden van elke tafel komt, en hoe ver hij gedraaid staat.
     Net als bij een stoelenkring begint de eerste tafel bovenaan en gaat het
     met de klok mee. Bij hoek 0 wijst de korte zijde naar het midden. */
  posities(element) {
    const meubel = Model.meubel(element.meubelId);
    const straal = this.straal(meubel, element.n);
    const middenlijn = straal - meubel.diepte / 2;   // van kringmidden tot tafelmidden

    const uit = [];
    for (let i = 0; i < element.n; i++) {
      const draai = 2 * Math.PI * i / element.n;
      uit.push({
        x: Math.round(middenlijn * Math.sin(draai)),
        y: Math.round(-middenlijn * Math.cos(draai)),
        hoek: draai * 180 / Math.PI
      });
    }
    return uit;
  },

  /* De buitenmaat van de hele kring, voor het eigenschappenpaneel. */
  doorsnede(element) {
    return 2 * this.straal(Model.meubel(element.meubelId), element.n);
  }
};
