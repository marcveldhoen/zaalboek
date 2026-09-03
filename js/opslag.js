/* opslag.js — het laden en bewaren van het ene JSON-document.

   Dit is het enige bestand dat weet dat de gegevens bij GitHub staan. De rest
   van de applicatie kent alleen 'geef het document' en 'bewaar het document'.
   Bevalt de plek later niet, dan wordt alleen dit bestand vervangen.

   Waar de gegevens staan: */
const OPSLAG_EIGENAAR    = "marcveldhoen";
const OPSLAG_OPSLAGPLAATS = "zaalboek-gegevens";
const OPSLAG_BESTAND      = "zaalboek.json";

const Opslag = {

  /* Hoe lang er gewacht wordt na de laatste wijziging voordat er bewaard wordt.
     Kort genoeg om niets te verliezen, lang genoeg om niet bij elk pijltje te
     schrijven. */
  wachttijd: 2000,
  hertestijd: 10000,        // na een verbindingsprobleem opnieuw proberen

  sha: null,                // welke versie van het bestand wij hebben opgehaald
  laatstBewaard: null,      // de tekst zoals hij bij GitHub staat
  wachtend: null,
  bezig: false,
  meld: () => {},           // wordt door app.js ingevuld

  /* ---------------- de sleutel ----------------
     De sleutel staat in de browser en nergens in de code. Per computer één keer
     invullen. */

  heeftSleutel()      { return !!localStorage.getItem("zaalboek-sleutel"); },
  sleutel()           { return localStorage.getItem("zaalboek-sleutel"); },
  bewaarSleutel(s)    { localStorage.setItem("zaalboek-sleutel", s.trim()); },
  vergeetSleutel()    { localStorage.removeItem("zaalboek-sleutel"); },

  /* ---------------- praten met GitHub ---------------- */

  adres() {
    return `https://api.github.com/repos/${OPSLAG_EIGENAAR}/${OPSLAG_OPSLAGPLAATS}/contents/${OPSLAG_BESTAND}`;
  },

  kop() {
    return {
      "Authorization": "Bearer " + this.sleutel(),
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  },

  /* Het document ophalen. Geeft het ingelezen document terug, of gooit een fout
     met een uitleg die rechtstreeks aan de gebruiker getoond kan worden. */
  async laden() {
    let antwoord;
    try {
      antwoord = await fetch(this.adres(), { headers: this.kop() });
    } catch (e) {
      throw this.fout("netwerk");
    }
    if (!antwoord.ok) throw this.fout(this.soortBijStatus(antwoord.status));

    const uit = await antwoord.json();
    this.sha = uit.sha;

    const tekst = this.uitBase64(uit.content);
    this.laatstBewaard = tekst;

    try {
      return JSON.parse(tekst);
    } catch (e) {
      throw this.fout("onleesbaar");
    }
  },

  /* Bewaren, maar pas als er even niets meer gewijzigd is. */
  bewaarStraks(tekst) {
    if (tekst === this.laatstBewaard) return;      // er is niets veranderd
    clearTimeout(this.wachtend);
    this.meld({ staat: "wachten" });
    this.wachtend = setTimeout(() => this.bewaarNu(tekst), this.wachttijd);
  },

  async bewaarNu(tekst) {
    // niet twee keer tegelijk schrijven; dat zou een botsing met onszelf geven
    if (this.bezig) {
      this.wachtend = setTimeout(() => this.bewaarNu(tekst), 500);
      return;
    }

    this.bezig = true;
    this.meld({ staat: "bezig" });

    try {
      let antwoord;
      try {
        antwoord = await fetch(this.adres(), {
          method: "PUT",
          headers: this.kop(),
          body: JSON.stringify({
            message: "Zaalboek bijgewerkt",
            content: this.naarBase64(tekst),
            sha: this.sha              // hiermee weigert GitHub een botsing
          })
        });
      } catch (e) {
        throw this.fout("netwerk");
      }

      if (!antwoord.ok) throw this.fout(this.soortBijStatus(antwoord.status));

      const uit = await antwoord.json();
      this.sha = uit.content.sha;
      this.laatstBewaard = tekst;
      this.meld({ staat: "bewaard", tijd: new Date() });

    } catch (fout) {
      this.meld({ staat: "fout", fout });
      // bij een verbindingsprobleem vanzelf opnieuw proberen
      if (fout.soort === "netwerk") {
        this.wachtend = setTimeout(() => this.bewaarNu(tekst), this.hertestijd);
      }
    } finally {
      this.bezig = false;
    }
  },

  /* ---------------- fouten in gewone taal ---------------- */

  soortBijStatus(status) {
    if (status === 401) return "sleutel";
    if (status === 403) return "geenToegang";
    if (status === 404) return "nietGevonden";
    if (status === 409 || status === 422) return "botsing";
    return "onbekend";
  },

  fout(soort) {
    const teksten = {
      sleutel:      "De sleutel wordt niet geaccepteerd. Waarschijnlijk is hij verlopen of ingetrokken. Maak bij GitHub een nieuwe aan en vul hem hieronder in.",
      geenToegang:  "GitHub geeft geen toegang. Controleer of de sleutel het recht 'Contents: Read and write' heeft op " + OPSLAG_OPSLAGPLAATS + ".",
      nietGevonden: `Het bestand ${OPSLAG_BESTAND} is niet gevonden in ${OPSLAG_EIGENAAR}/${OPSLAG_OPSLAGPLAATS}. Controleer of de opslagplaats en het bestand bestaan, en of de sleutel toegang heeft tot juist deze opslagplaats.`,
      botsing:      "Iemand anders heeft de gegevens ondertussen gewijzigd. Jouw laatste wijziging is niet bewaard.",
      netwerk:      "Geen verbinding met GitHub.",
      onleesbaar:   `Het bestand ${OPSLAG_BESTAND} is geen geldig JSON-document en kan niet ingelezen worden.`,
      onbekend:     "GitHub gaf een antwoord dat ik niet verwachtte."
    };
    return { soort, tekst: teksten[soort] };
  },

  /* ---------------- tekst en base64 ----------------
     GitHub bewaart de inhoud als base64. De omweg via bytes is nodig omdat
     namen als 'Grote zaal' letters kunnen bevatten die niet in één byte passen. */

  naarBase64(tekst) {
    const bytes = new TextEncoder().encode(tekst);
    let binair = "";
    bytes.forEach(b => binair += String.fromCharCode(b));
    return btoa(binair);
  },

  uitBase64(inhoud) {
    const binair = atob(String(inhoud).replace(/\s/g, ""));   // GitHub knipt de tekst in regels
    const bytes = Uint8Array.from(binair, teken => teken.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
};
