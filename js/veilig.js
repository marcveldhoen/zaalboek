/* veilig.js — tekst veilig in een stukje HTML zetten.

   De schermen bouwen hun inhoud als HTML-tekst, met namen en opmerkingen
   uit de gegevens erin (`${veilig(zaal.naam)}`). Zou zo'n naam zelf HTML
   bevatten, bijvoorbeeld "<img onerror=...>", dan voert de browser dat uit,
   en dat terwijl de sleutel voor de opslag in diezelfde browser staat.

   Daarom gaat elke tekst uit de gegevens eerst door veilig(): de tekens die
   in HTML iets betekenen worden gewone tekens. "Koor & Orkest" blijft er
   gewoon "Koor & Orkest" uitzien.

   Vuistregel bij nieuwe code: alles wat iemand kan intypen (namen,
   opschriften, opmerkingen, tijden) gaat in een HTML-sjabloon altijd via
   veilig(). Vaste teksten uit de code zelf hoeven niet. In de tekening
   (SVG) wordt textContent gebruikt; dat is al veilig. */

function veilig(tekst) {
  if (tekst == null) return "";
  return String(tekst)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
