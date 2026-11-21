/* aanwijzer.js — het Aanwijzer-tooltje voor de lokale testopstelling.

   Alleen geladen in de testpagina die gereedschap/testserver.js maakt, nooit
   in index.html. Hiermee klik je in de app op een onderdeel en zeg of typ je
   wat er moet veranderen; opmaak (vet, cursief, onderstreept, kleuren) kun je
   meteen als voorbeeld op het scherm zetten.

   De gang van zaken:
   1. Aanwijzen: knop "Aanwijzen" rechtsonder (of Shift+A), klik op een
      onderdeel, typ of spreek in, kies eventueel opmaak, Bewaar (of Enter).
      Een tekst aanpassen: in de aanwijsmodus op de tekst klikken en typen,
      in het Zaalboek zelf. Enter of ergens anders klikken bewaart, Esc zet
      de oude tekst terug; het knopje 💬 ernaast opent het venster.
   2. Verwerken: in de Lijst op "Verwerk" klikken. De testserver laat Claude
      Code de code aanpassen, zonder commit. Daarna herlaadt de pagina.
   3. Bekijken: een verwerkte aanwijzing krijgt een groen speldje ✓. Niet
      tevreden? Klik erop (of op "Reageer" in de Lijst) en zeg wat er anders
      moet; elke aanwijzing is een gesprekje, en Claude bouwt bij het volgende
      "Verwerk" voort op wat er al staat. Tevreden: "Goedkeuren en live
      zetten" (Claude controleert, commit en pusht naar main). Alles weg:
      "Terugdraaien".

   Het tooltje verandert niets aan de app zelf. Alles wat het toont staat in
   één eigen laag (#aanwijzer) die boven de app ligt; de opmaakvoorbeelden in
   één eigen <style>-blok. */

(function () {
  "use strict";

  const VANGNET = "zaalboek-aanwijzingen";      // localStorage, als de server weg is
  const NA_HERLADEN = "zaalboek-aanwijzer-melding";

  const staat = {
    lijst: [],
    modus: false,
    onderMuis: null,     // het element waar de muis nu op staat
    venster: null,       // het open chatvenster (zie openVenster)
    typen: null,         // de tekst waarin nu getypt wordt (zie startTypen)
    lijstOpen: false,
    nietBewaard: false,
    taak: null,          // wat Claude op de achtergrond doet (van /taak)
    wijzigingen: { bestanden: [], nietGepusht: 0 }
  };

  /* De kleuren van de app zelf, als keuze bij de opmaak. Bewaard als
     var(--…), zodat Claude de bestaande CSS-variabele gebruikt. */
  const KLEUREN = [
    ["accent (groen)", "--accent"], ["donker", "--ink"], ["grijs", "--ink-soft"],
    ["lichtgrijs", "--ink-faint"], ["eiken", "--oak"], ["licht eiken", "--oak-light"],
    ["hout", "--wood"], ["leisteen", "--slate"], ["vloer", "--floor"]
  ];

  /* ---------------- de eigen laag ---------------- */

  const stijl = document.createElement("style");
  stijl.textContent = `
    #aanwijzer, #aanwijzer * { box-sizing: border-box; font-family: var(--font, system-ui, sans-serif); }
    #aanwijzer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; }
    #aanwijzer .aw-rand { position: fixed; border: 2px solid #D9480F; background: rgba(217,72,15,.08);
      border-radius: 3px; pointer-events: none; display: none; }
    #aanwijzer .aw-label { position: fixed; background: #D9480F; color: #fff; font-size: 12px;
      padding: 2px 6px; border-radius: 3px; pointer-events: none; display: none; white-space: nowrap; }
    #aanwijzer .aw-balk { position: fixed; right: 16px; bottom: 16px; display: flex; gap: 6px; pointer-events: auto; }
    #aanwijzer button { font-size: 13px; border: 1px solid #C9C6BC; background: #fff; color: #232B2B;
      border-radius: 6px; padding: 7px 12px; cursor: pointer; }
    #aanwijzer button:hover:not(:disabled) { background: #F2F1EC; }
    #aanwijzer button:disabled { opacity: .45; cursor: default; }
    #aanwijzer .aw-aan, #aanwijzer .aw-aan:hover:not(:disabled) { background: #D9480F; border-color: #D9480F; color: #fff; }
    #aanwijzer .aw-hoofd, #aanwijzer .aw-hoofd:hover:not(:disabled) { background: #2F6F6A; border-color: #2F6F6A; color: #fff; }
    #aanwijzer .aw-waarschuwing { border-color: #C92A2A; color: #C92A2A; }
    #aanwijzer .aw-venster, #aanwijzer .aw-lijst { position: fixed; background: #fff; border: 1px solid #C9C6BC;
      border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.18); pointer-events: auto; color: #232B2B; font-size: 13px; }
    #aanwijzer .aw-venster { width: 340px; padding: 10px; }
    #aanwijzer .aw-wat { font-size: 12px; color: #5A6462; margin-bottom: 6px; }
    #aanwijzer .aw-invoer { display: flex; gap: 6px; align-items: flex-start; }
    #aanwijzer textarea { flex: 1; min-height: 72px; resize: vertical; font-size: 13px; padding: 6px;
      border: 1px solid #C9C6BC; border-radius: 5px; color: #232B2B; background: #fff; }
    #aanwijzer .aw-mic { padding: 6px 9px; font-size: 16px; line-height: 1; }
    #aanwijzer .aw-mic.aw-aan { animation: aw-knipper 1.2s infinite; }
    @keyframes aw-knipper { 50% { opacity: .55; } }
    #aanwijzer .aw-opmaak { margin-top: 8px; border-top: 1px solid #E2E0D7; padding-top: 8px; }
    #aanwijzer .aw-rij { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
    #aanwijzer .aw-rij > span { width: 66px; font-size: 12px; color: #5A6462; }
    #aanwijzer .aw-schakel { width: 30px; padding: 4px 0; text-align: center; }
    #aanwijzer .aw-staal { width: 20px; height: 20px; padding: 0; border-radius: 50%; border: 1px solid #C9C6BC; }
    #aanwijzer .aw-staal.aw-gekozen { outline: 2px solid #D9480F; outline-offset: 1px; }
    #aanwijzer input[type=color] { width: 26px; height: 22px; padding: 0; border: 1px solid #C9C6BC; border-radius: 4px; background: #fff; }
    #aanwijzer .aw-bereik label { font-size: 12px; margin-right: 8px; }
    #aanwijzer .aw-praat { position: fixed; padding: 2px 6px; font-size: 13px; line-height: 1.3;
      pointer-events: auto; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
    #aanwijzer .aw-klein { font-size: 12px; color: #5A6462; }
    #aanwijzer .aw-knoppen { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    #aanwijzer .aw-lijst { right: 16px; bottom: 60px; width: 400px; max-height: 70vh; overflow: auto; padding: 10px; }
    #aanwijzer .aw-lijst h3 { margin: 0 0 8px; font-size: 14px; }
    #aanwijzer .aw-vak { background: #F7F6F2; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
    #aanwijzer .aw-vak pre { white-space: pre-wrap; font-size: 12px; margin: 6px 0 0; max-height: 140px; overflow: auto; }
    #aanwijzer .aw-item { border-top: 1px solid #E2E0D7; padding: 8px 0; }
    #aanwijzer .aw-item.aw-verwerkt .aw-tekst { color: #949C99; }
    #aanwijzer .aw-item .aw-tekst { white-space: pre-wrap; margin: 2px 0 4px; }
    #aanwijzer .aw-antwoord { color: #2F6F6A; font-size: 12px; margin-bottom: 4px; }
    #aanwijzer .aw-vraag { color: #1C5D99; font-size: 12px; margin-bottom: 4px; font-weight: 600; }
    #aanwijzer .aw-item button { padding: 3px 8px; font-size: 12px; }
    #aanwijzer .aw-leeg { color: #5A6462; }
    #aanwijzer .aw-speld { position: fixed; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
      background: #D9480F; color: #fff; font-size: 12px; font-weight: 600; display: flex; align-items: center;
      justify-content: center; pointer-events: auto; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
    #aanwijzer .aw-speld.aw-speld-vraag { background: #1C5D99; }
    #aanwijzer .aw-speld.aw-speld-klaar { background: #2F6F6A; }
    #aanwijzer .aw-gesprek { max-height: 180px; overflow: auto; margin-bottom: 8px; padding-bottom: 6px;
      border-bottom: 1px solid #E2E0D7; }
    #aanwijzer .aw-bericht { white-space: pre-wrap; margin-bottom: 6px; }
    #aanwijzer .aw-van-claude { color: #2F6F6A; }
    #aanwijzer .aw-van-claude.aw-is-vraag { color: #1C5D99; }
    #aanwijzer .aw-van-systeem { color: #949C99; font-style: italic; }
    #aanwijzer .aw-melding { position: fixed; right: 16px; bottom: 60px; max-width: 380px; background: #232B2B; color: #fff;
      padding: 8px 12px; border-radius: 6px; font-size: 13px; pointer-events: none; }
  `;
  document.head.appendChild(stijl);

  // de opmaakvoorbeelden: wat Marc ziet voordat Claude het definitief maakt
  const voorbeelden = document.createElement("style");
  voorbeelden.id = "aanwijzer-voorbeelden";
  document.head.appendChild(voorbeelden);

  const laag = document.createElement("div");
  laag.id = "aanwijzer";
  laag.innerHTML = `
    <div class="aw-rand"></div>
    <div class="aw-label"></div>
    <div class="aw-spelden"></div>
    <div class="aw-balk">
      <button type="button" class="aw-lijstknop" title="Alle aanwijzingen, verwerken en live zetten">Lijst (0)</button>
      <button type="button" class="aw-modusknop" title="Klik daarna op een onderdeel (Shift+A)">Aanwijzen</button>
    </div>`;
  document.body.appendChild(laag);

  const rand      = laag.querySelector(".aw-rand");
  const label     = laag.querySelector(".aw-label");
  const spelden   = laag.querySelector(".aw-spelden");
  const lijstknop = laag.querySelector(".aw-lijstknop");
  const modusknop = laag.querySelector(".aw-modusknop");

  const vanOns = el => el instanceof Node && laag.contains(el);
  const claudeBezig = () => !!(staat.taak && staat.taak.bezig);
  const isOpen = a => a.status === "open" || a.status === "vraag";
  const laatste = a => (a.gesprek && a.gesprek[a.gesprek.length - 1]) || null;
  // nog niet verwerkt en het laatste woord is van Marc: dan bewerk je dat bericht
  const kanBewerken = a => a.status === "open" && laatste(a) && laatste(a).van === "marc";

  /* Elke aanwijzing is een gesprek: berichten van Marc ("marc"), van Claude
     ("claude", eventueel met vraag: true) en meldingen ("systeem"). Een
     bericht van Marc kan ook "stijl" (opmaak) en "tekstwijziging" ({ oud,
     nieuw }) hebben. */

  // een bericht in één regel, zoals in het gesprek
  function berichtTekst(b) {
    const delen = [];
    if (b.tekstwijziging) delen.push(`Tekst wijzigen: ‘${b.tekstwijziging.oud}’ → ‘${b.tekstwijziging.nieuw}’`);
    if (b.tekst) delen.push(b.tekst);
    return delen.join("\n");
  }

  function tekenGesprek(doel, berichten) {
    berichten.forEach(b => {
      const r = document.createElement("div");
      r.className = "aw-bericht aw-van-" + b.van + (b.vraag ? " aw-is-vraag" : "");
      const wie = document.createElement("b");
      wie.textContent = b.van === "marc" ? "Jij: " : b.van === "claude" ? (b.vraag ? "Claude vraagt: " : "Claude: ") : "";
      r.appendChild(wie);
      r.appendChild(document.createTextNode(berichtTekst(b)));
      if (heeftStijl(b.stijl)) {
        const st = document.createElement("div");
        st.className = "aw-klein";
        st.textContent = beschrijfStijl(b.stijl);
        r.appendChild(st);
      }
      doel.appendChild(r);
    });
  }

  const STATUSNAAM = {
    nieuw: "nieuw, nog te verwerken",
    reactie: "jouw reactie, nog te verwerken",
    vraag: "Claude heeft een vraag",
    verwerkt: "verwerkt: bekijk het, reageer of zet live"
  };
  function statusNaam(a) {
    if (a.status === "open") return a.gesprek.some(b => b.van === "claude") ? STATUSNAAM.reactie : STATUSNAAM.nieuw;
    return STATUSNAAM[a.status] || a.status;
  }

  /* ---------------- een onderdeel beschrijven ----------------
     Zo dat Claude het in de code terugvindt: wat het is, de tekst erop, de
     id, klassen en data-attributen, en een CSS-pad om het in de pagina terug
     te vinden. */

  /* In de tekening is de aangeklikte vorm meestal een losse lijn of
     rechthoek; het element zelf is de groep met een volgnummer. */
  function kiesOnderdeel(el) {
    if (!el || vanOns(el)) return null;
    const groep = el.closest && el.closest("[data-volgnummer], [data-vast]");
    return groep || el;
  }

  function korteTekst(el) {
    const t = (el.getAttribute && (el.getAttribute("aria-label") || el.getAttribute("title"))) ||
              el.textContent || el.value || el.placeholder || "";
    const kort = String(t).replace(/\s+/g, " ").trim();
    return kort.length > 60 ? kort.slice(0, 57) + "…" : kort;
  }

  function labelVanVeld(el) {
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return korteTekst(l);
    }
    const omhullend = el.closest("label");
    if (omhullend) return korteTekst(omhullend);
    return el.getAttribute("aria-label") || el.placeholder || el.name || "";
  }

  function omschrijving(el) {
    if (el.hasAttribute("data-volgnummer")) return `element nr ${el.getAttribute("data-volgnummer")} in de tekening`;
    if (el.hasAttribute("data-vast"))       return `vast object nr ${el.getAttribute("data-vast")} in de zaal`;
    const tag = el.tagName.toLowerCase();
    const tekst = korteTekst(el);
    if (tag === "button" || el.getAttribute("role") === "button") return `knop ‘${tekst}’`;
    if (tag === "input" || tag === "select" || tag === "textarea") return `invulveld ‘${labelVanVeld(el)}’`;
    if (/^h[1-6]$/.test(tag)) return `kop ‘${tekst}’`;
    if (tag === "a") return `link ‘${tekst}’`;
    if (el.id) return `${tag}#${el.id}`;
    return tekst ? `${tag} ‘${tekst}’` : tag;
  }

  function cssPad(el) {
    const delen = [];
    while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement) {
      if (el.id) { delen.unshift("#" + CSS.escape(el.id)); break; }
      let deel = el.tagName.toLowerCase();
      const kenmerk = ["data-volgnummer", "data-vast", "data-zaal", "data-doe", "data-maat", "data-vastnieuw"]
        .find(a => el.hasAttribute(a));
      if (kenmerk) {
        deel += `[${kenmerk}="${el.getAttribute(kenmerk).replace(/["\\]/g, "\\$&")}"]`;
      } else if (el.parentElement) {
        const zelfde = Array.from(el.parentElement.children).filter(k => k.tagName === el.tagName);
        if (zelfde.length > 1) deel += `:nth-of-type(${zelfde.indexOf(el) + 1})`;
      }
      delen.unshift(deel);
      el = el.parentElement;
    }
    return delen.join(" > ");
  }

  /* De eigen tekst van een onderdeel: alleen de tekst die er direct in staat,
     niet die van een icoontje of van onderdelen erbinnen. Zo blijft bij het
     aanpassen een icoontje in een knop gewoon staan. Niet in de tekening. */
  function tekstKnoop(el) {
    if (!el || el instanceof SVGElement) return null;
    return Array.from(el.childNodes).find(k => k.nodeType === 3 && k.nodeValue.trim()) || null;
  }

  function eigenTekst(el) {
    const k = tekstKnoop(el);
    return k ? k.nodeValue.trim() : "";
  }

  function zetEigenTekst(el, tekst) {
    const k = tekstKnoop(el);
    if (!k || k.nodeValue.trim() === tekst) return;
    // spaties eromheen laten staan
    // als functie, anders betekenen tekens als $& in de nieuwe tekst iets anders
    k.nodeValue = k.nodeValue.replace(k.nodeValue.trim(), () => tekst);
  }

  function klassenVan(el) {
    return (typeof el.className === "string" ? el.className : (el.getAttribute("class") || ""))
      .split(/\s+/).filter(Boolean);
  }

  /* "Alle gelijke onderdelen": hetzelfde soort element met dezelfde klassen. */
  function gelijkeSelector(el) {
    const klassen = klassenVan(el);
    if (!klassen.length) return null;
    return el.tagName.toLowerCase() + klassen.map(k => "." + CSS.escape(k)).join("");
  }

  function dataKenmerken(el) {
    const uit = {};
    for (const a of el.attributes) if (a.name.startsWith("data-")) uit[a.name] = a.value;
    return uit;
  }

  function welkScherm() {
    const zichtbaar = id => { const e = document.getElementById(id); return e && !e.hidden; };
    if (zichtbaar("startscherm"))  return "overzicht";
    if (zichtbaar("afdrukscherm")) return "afdrukken";
    if (zichtbaar("beheerscherm")) return "beheer";
    if (zichtbaar("strook"))       return "tekenscherm";
    return "zaal inrichten";
  }

  function vastleggen(el) {
    const r = el.getBoundingClientRect();
    const kruimel = document.getElementById("kruimel");
    return {
      nummer: staat.lijst.reduce((m, a) => Math.max(m, a.nummer || 0), 0) + 1,
      tijd: new Date().toISOString(),
      status: "open",
      gesprek: [],
      scherm: welkScherm(),
      kruimelpad: kruimel ? Array.from(kruimel.children).map(k => k.textContent.trim()).filter(Boolean).join(" · ") : "",
      onderdeel: {
        omschrijving: omschrijving(el),
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        klassen: klassenVan(el).join(" "),
        tekst: korteTekst(el),
        data: dataKenmerken(el),
        cssPad: cssPad(el)
      },
      positie: { x: Math.round(r.left), y: Math.round(r.top), breedte: Math.round(r.width), hoogte: Math.round(r.height) },
      venster: { breedte: window.innerWidth, hoogte: window.innerHeight }
    };
  }

  /* ---------------- opmaakvoorbeelden ----------------
     Een stijl is { bereik: "dit" | "alle", selector, eigenschappen }. Als
     voorbeeld wordt hij met !important over de app heen gelegd; Claude maakt
     hem bij het verwerken definitief in de css. */

  function stijlRegel(s) {
    if (!s || !s.selector) return "";
    const regels = Object.entries(s.eigenschappen || {}).map(([k, v]) => `${k}: ${v} !important;`).join(" ");
    return regels ? `${s.selector} { ${regels} }` : "";
  }

  function heeftStijl(s) {
    return !!(s && s.eigenschappen && Object.keys(s.eigenschappen).length);
  }

  function tekenVoorbeelden() {
    const bewerkt = staat.venster && staat.venster.aanwijzing;
    const regels = staat.lijst
      .filter(a => isOpen(a) && a !== bewerkt && heeftStijl(a.stijl))
      .map(a => stijlRegel(a.stijl));
    if (staat.venster && staat.venster.stijl) regels.push(stijlRegel(staat.venster.stijl));
    const tekst = regels.filter(Boolean).join("\n");
    if (voorbeelden.textContent !== tekst) voorbeelden.textContent = tekst;
  }

  function beschrijfStijl(s) {
    if (!heeftStijl(s)) return "";
    const namen = { "font-weight": "dikte", "font-style": "schuin", "text-decoration": "streep",
                    "color": "tekstkleur", "background-color": "vlakkleur" };
    const kleurnaam = v => (KLEUREN.find(([, n]) => v === `var(${n})`) || [v])[0];
    const delen = Object.entries(s.eigenschappen).map(([k, v]) => {
      if (k === "font-weight") return v === "700" ? "vet" : "niet vet";
      if (k === "font-style") return v === "italic" ? "cursief" : "niet cursief";
      if (k === "text-decoration") return v === "underline" ? "onderstreept" : "niet onderstreept";
      return `${namen[k] || k} ${kleurnaam(v)}`;
    });
    return "Opmaak: " + delen.join(", ") + (s.bereik === "alle" ? " (alle gelijke onderdelen)" : "");
  }

  /* ---------------- bewaren en ophalen ---------------- */

  async function ophalen() {
    try {
      const antwoord = await fetch("/aanwijzingen", { cache: "no-store" });
      if (!antwoord.ok) throw new Error(antwoord.status);
      staat.lijst = await antwoord.json();
      // was er nog iets dat niet bij de server aankwam? Dan dat bewaren.
      const vangnet = leesVangnet();
      if (vangnet && vangnet.nietBewaard && !claudeBezig()) {
        staat.lijst = vangnet.lijst;
        await bewaren();
      }
    } catch (e) {
      const vangnet = leesVangnet();
      staat.lijst = vangnet ? vangnet.lijst : [];
      meld("De testserver is niet bereikbaar; aanwijzingen staan alleen in deze browser.");
    }
    tekenAlles();
  }

  function leesVangnet() {
    try { return JSON.parse(localStorage.getItem(VANGNET)); } catch (e) { return null; }
  }

  async function bewaren() {
    try {
      const antwoord = await fetch("/aanwijzingen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staat.lijst)
      });
      if (antwoord.status === 423) {
        meld("Claude is bezig met de aanwijzingen; wacht tot dat klaar is.");
        await ophalen();
        return;
      }
      if (!antwoord.ok) throw new Error(antwoord.status);
      staat.nietBewaard = false;
    } catch (e) {
      staat.nietBewaard = true;
      meld("Niet bewaard in aanwijzingen.json: is de testserver gestopt? Ze staan wel in deze browser.");
    }
    localStorage.setItem(VANGNET, JSON.stringify({ lijst: staat.lijst, nietBewaard: staat.nietBewaard }));
    tekenAlles();
  }

  /* ---------------- meldingen ---------------- */

  let meldingTijd = null;
  function meld(tekst, seconden) {
    let m = laag.querySelector(".aw-melding");
    if (!m) { m = document.createElement("div"); m.className = "aw-melding"; laag.appendChild(m); }
    m.textContent = tekst;
    clearTimeout(meldingTijd);
    meldingTijd = setTimeout(() => m.remove(), (seconden || 6) * 1000);
  }

  /* ---------------- de aanwijsmodus ---------------- */

  function zetModus(aan) {
    if (!aan && staat.typen) stopTypen(true);
    staat.modus = aan;
    modusknop.classList.toggle("aw-aan", aan);
    modusknop.textContent = aan ? "Aanwijzen (Esc = stoppen)" : "Aanwijzen";
    if (!aan) { staat.onderMuis = null; if (!staat.venster) toonRand(null); }
  }

  function toonRand(el) {
    if (!el) { rand.style.display = "none"; label.style.display = "none"; return; }
    const r = el.getBoundingClientRect();
    Object.assign(rand.style, { display: "block", left: r.left + "px", top: r.top + "px",
                                width: r.width + "px", height: r.height + "px" });
    label.textContent = omschrijving(el);
    label.style.display = "block";
    label.style.left = Math.max(4, r.left) + "px";
    label.style.top = (r.top > 24 ? r.top - 22 : r.bottom + 4) + "px";
  }

  window.addEventListener("pointermove", ev => {
    if (!staat.modus || staat.venster || staat.typen) return;
    const el = kiesOnderdeel(document.elementFromPoint(ev.clientX, ev.clientY));
    if (el !== staat.onderMuis) { staat.onderMuis = el; toonRand(el); }
  }, true);

  /* In de aanwijsmodus mag de app de klik niet krijgen: geen slepen, geen
     knop indrukken. Daarom worden deze gebeurtenissen al bij het venster
     onderschept, vóór de app ze ziet. Klikken op het tooltje zelf gaan door.

     Klik op een tekst: typen in het Zaalboek zelf (startTypen). Klik op iets
     zonder eigen tekst: het venster. Het typvak hoort bij het tooltje, dus
     klikken daarin gaan gewoon door. */
  ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "contextmenu"].forEach(soort => {
    window.addEventListener(soort, ev => {
      if (!staat.modus || vanOns(ev.target)) return;
      ev.stopPropagation();
      ev.preventDefault();
      if (soort !== "pointerdown" || staat.venster) return;
      if (staat.typen) stopTypen(true);                  // ergens anders klikken = bewaren
      const el = kiesOnderdeel(document.elementFromPoint(ev.clientX, ev.clientY));
      if (!el) return;
      if (eigenTekst(el)) startTypen(el, ev.clientX, ev.clientY);
      else openVenster(el, null);
    }, true);
  });

  /* Toetsen: Esc stopt, Shift+A wisselt. Toetsen die in het tooltje getypt
     worden, gaan niet naar de app (anders zou Delete of R in de tekening iets
     doen). */
  window.addEventListener("keydown", ev => {
    if (staat.typen && staat.typen.span.contains(ev.target)) {
      ev.stopPropagation();                    // de sneltoetsen van de app niet
      if (ev.key === "Enter") { ev.preventDefault(); stopTypen(true); }
      else if (ev.key === "Escape") { ev.preventDefault(); stopTypen(false); }
      return;
    }
    if (vanOns(ev.target)) {
      ev.stopPropagation();
      if (ev.key === "Enter" && !ev.shiftKey && ev.target.tagName === "TEXTAREA") {
        ev.preventDefault();
        bewaarVenster();
      } else if (ev.key === "Escape") {
        sluitVenster();
      }
      return;
    }
    const typtIets = ev.target.closest && ev.target.closest("input, textarea, select, [contenteditable]");
    if (ev.key === "Escape" && (staat.modus || staat.venster)) {
      ev.stopPropagation();
      sluitVenster();
      zetModus(false);
    } else if (ev.key === "A" && ev.shiftKey && !typtIets && !ev.metaKey && !ev.ctrlKey) {
      ev.stopPropagation();
      ev.preventDefault();
      zetModus(!staat.modus);
    }
  }, true);

  /* ---------------- typen in het Zaalboek zelf ----------------
     Browsers laten niet typen in tekst binnen een knop of link. Daarom:
     het stukje tekst in het Zaalboek wordt even onzichtbaar (in een eigen
     <span>, "de plek"), en precies daarop ligt een typvak in hetzelfde
     lettertype en dezelfde kleur. Elke letter gaat meteen ook in de plek,
     zodat de knop meegroeit en je het echte resultaat ziet. Een icoontje
     ernaast blijft staan. Na afloop is de plek weer gewone tekst. */

  // de open aanwijzing (of die met een verwerkte wijziging) voor dit onderdeel
  function aanwijzingVoor(el) {
    const pad = cssPad(el);
    const zelfde = staat.lijst.filter(a => a.onderdeel.cssPad === pad);
    return zelfde[zelfde.length - 1] || null;
  }

  function startTypen(el, x, y) {
    if (claudeBezig()) { meld("Claude is bezig met de aanwijzingen; wacht tot dat klaar is."); return; }
    const knoop = tekstKnoop(el);
    if (!knoop) return;
    const huidig = knoop.nodeValue.trim();

    // waar in de tekst werd geklikt? (vóór het inpakken)
    let klikplek = null;
    const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y)
            : document.caretPositionFromPoint ? document.caretPositionFromPoint(x, y) : null;
    if (r && (r.startContainer || r.offsetNode) === knoop) klikplek = r.startOffset != null ? r.startOffset : r.offset;


    const bestaand = aanwijzingVoor(el);
    const lopend = bestaand && isOpen(bestaand) && bestaand.tekstwijziging;
    const t = {
      el, huidig, laatste: huidig,
      oud: lopend ? bestaand.tekstwijziging.oud : huidig,   // de tekst zoals hij in de code staat
      vooraf: vastleggen(el)          // het onderdeel vóór het typen, voor een nieuwe aanwijzing
    };

    // de tekst inpakken; spaties eromheen blijven erbuiten
    const waarde = knoop.nodeValue;
    const begin = waarde.indexOf(huidig);
    const plek = document.createElement("span");
    plek.style.visibility = "hidden";
    plek.textContent = huidig;
    knoop.replaceWith(document.createTextNode(waarde.slice(0, begin)), plek,
                      document.createTextNode(waarde.slice(begin + huidig.length)));
    t.plek = plek;

    // het typvak, met de letter en kleur van het onderdeel
    const cs = getComputedStyle(el);
    let achter = "#ffffff";
    for (let o = el; o && o !== document.documentElement; o = o.parentElement) {
      const kleur = getComputedStyle(o).backgroundColor;
      if (kleur && kleur !== "transparent" && !/rgba\(.*,\s*0\)$/.test(kleur)) { achter = kleur; break; }
    }
    const span = document.createElement("span");
    try { span.contentEditable = "plaintext-only"; } catch (e) { span.contentEditable = "true"; }
    span.className = "aw-typen";
    span.spellcheck = false;
    Object.assign(span.style, {
      position: "fixed", pointerEvents: "auto", whiteSpace: "pre-wrap", cursor: "text",
      lineHeight: cs.lineHeight, boxSizing: "content-box", overflowWrap: "break-word",
      fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform,
      color: cs.color, background: achter, outline: "2px dashed #D9480F", outlineOffset: "2px",
      minWidth: "1ch", padding: "0", margin: "0"
    });
    span.textContent = huidig;
    laag.appendChild(span);
    t.span = span;

    span.addEventListener("input", () => {
      // geen nieuwe regels (bijvoorbeeld bij plakken)
      if (/\n/.test(span.textContent)) span.textContent = span.textContent.replace(/\s*\n\s*/g, " ");
      t.laatste = span.textContent;
      if (plek.isConnected) plek.textContent = span.textContent || "\u00a0";
      plaatsTypen();
    });
    span.addEventListener("paste", ev => {
      ev.preventDefault();
      const platte = (ev.clipboardData && ev.clipboardData.getData("text/plain") || "").replace(/\s+/g, " ");
      document.execCommand("insertText", false, platte);
    });

    // het knopje ernaast: het venster voor een wens of opmaak
    const praat = document.createElement("button");
    praat.type = "button";
    praat.className = "aw-praat";
    praat.textContent = "💬";
    praat.title = "Een wens of opmaak bij dit onderdeel";
    praat.addEventListener("click", () => {
      const doel = t.el;
      stopTypen(true);
      openVenster(doel, aanwijzingVoor(doel));
    });
    laag.appendChild(praat);
    t.praat = praat;

    staat.typen = t;
    toonRand(null);
    plaatsTypen();

    // cursor op de plek van de klik
    span.focus();
    const bereik = document.createRange();
    const tekstIn = span.firstChild;
    const pos = klikplek == null ? huidig.length : Math.max(0, Math.min(huidig.length, klikplek - begin));
    if (tekstIn) { bereik.setStart(tekstIn, pos); bereik.collapse(true); }
    else { bereik.selectNodeContents(span); bereik.collapse(false); }
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(bereik);

    /* Zaal-, verenigings- en meubelnamen komen uit de gegevens: die wijzig je
       in de app zelf. De controle loopt naast het typen, zodat er geen letter
       verloren gaat; blijkt het een naam uit de gegevens, dan stopt het typen. */
    fetch("/gegevenstekst?tekst=" + encodeURIComponent(huidig), { cache: "no-store" })
      .then(r => r.json())
      .then(uit => {
        if (!uit.inGegevens || staat.typen !== t) return;
        stopTypen(false);
        meld("‘" + huidig + "’ komt uit de gegevens (een zaal-, verenigings- of meubelnaam). Wijzig die in de app zelf, via Beheer of Wijzigen.", 8);
      })
      .catch(() => {});
  }

  // het typvak precies op de plek, en het knopje 💬 ernaast
  function plaatsTypen() {
    const t = staat.typen;
    if (!t || !t.plek.isConnected) return;
    // over de hele plek, ook als de tekst over meer regels loopt
    const r = t.plek.getBoundingClientRect();
    Object.assign(t.span.style, { left: r.left + "px", top: r.top + "px",
                                  width: Math.ceil(r.width + 1) + "px", minHeight: r.height + "px" });
    const v = t.span.getBoundingClientRect();
    t.praat.style.left = (v.right + 8) + "px";
    t.praat.style.top = (r.top + r.height / 2 - 12) + "px";
  }

  /* Klaar met typen: bewaren (Enter, ergens anders klikken) of de oude
     tekst terugzetten (Esc). Heeft de app de tekst intussen opnieuw
     getekend, dan wordt wat er getypt was toch bewaard. */
  function stopTypen(bewaar) {
    const t = staat.typen;
    if (!t) return;
    staat.typen = null;
    t.praat.remove();
    t.span.remove();

    const nieuw = (t.laatste || "").replace(/\s+/g, " ").trim();
    const tonen = bewaar && nieuw ? nieuw : t.huidig;
    if (t.plek.isConnected) {
      t.plek.replaceWith(document.createTextNode(tonen));
      t.el.normalize();                       // weer één tekst, zoals de app hem maakte
    }
    window.getSelection().removeAllRanges();
    if (bewaar && nieuw && nieuw !== t.huidig) registreerTekst(t, nieuw);
  }

  /* De getypte tekst als aanwijzing: een nieuwe, of bij een bestaande het
     laatste bericht bijwerken (nog niet verwerkt) of een reactie toevoegen
     (verwerkt, of Claude had een vraag). */
  function registreerTekst(t, nieuw) {
    const nu = new Date().toISOString();
    let a = aanwijzingVoor(t.el);

    // terug naar de tekst uit de code: de tekstwijziging vervalt
    if (nieuw === t.oud) {
      if (a && kanBewerken(a) && laatste(a).tekstwijziging) {
        const l = laatste(a);
        delete l.tekstwijziging;
        delete a.tekstwijziging;
        if (!l.tekst && !l.stijl) a.gesprek.pop();
        if (!a.gesprek.length) staat.lijst = staat.lijst.filter(x => x !== a);
        bewaren();
      }
      return;
    }

    const wijziging = { oud: t.oud, nieuw };
    if (a && kanBewerken(a)) {
      laatste(a).tekstwijziging = wijziging;
      laatste(a).tijd = nu;
    } else if (a) {
      a.gesprek.push({ van: "marc", tekst: "", tijd: nu, tekstwijziging: wijziging });
      a.status = "open";
    } else {
      a = t.vooraf;
      a.nummer = staat.lijst.reduce((m, x) => Math.max(m, x.nummer || 0), 0) + 1;
      a.tijd = nu;
      a.gesprek.push({ van: "marc", tekst: "", tijd: nu, tekstwijziging: wijziging });
      staat.lijst.push(a);
    }
    a.tekstwijziging = wijziging;
    bewaren();
  }

  /* ---------------- inspreken ----------------
     Met de spraakherkenning van de browser (Safari en Chrome). Werkt die
     niet, dan kan altijd het dicteren van de Mac zelf: twee keer op de
     Fn-toets (of de microfoontoets), in het tekstvak. */

  const Spraak = window.SpeechRecognition || window.webkitSpeechRecognition;

  function koppelSpraak(knop, vak) {
    if (!Spraak) {
      knop.title = "Deze browser kan niet inspreken. Gebruik dicteren van de Mac: klik in het tekstvak en druk twee keer op Fn.";
      knop.addEventListener("click", () => { vak.focus(); meld(knop.title, 8); });
      return () => {};
    }
    let herkenning = null;
    let basis = "";

    const stop = () => { if (herkenning) { herkenning.stop(); herkenning = null; } knop.classList.remove("aw-aan"); };

    knop.addEventListener("click", () => {
      if (herkenning) { stop(); return; }
      herkenning = new Spraak();
      herkenning.lang = "nl-NL";
      herkenning.continuous = true;
      herkenning.interimResults = true;
      basis = vak.value.trim() ? vak.value.trim() + " " : "";
      herkenning.onresult = ev => {
        let vast = "", voorlopig = "";
        for (let i = 0; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) vast += r[0].transcript; else voorlopig += r[0].transcript;
        }
        vak.value = basis + vast + voorlopig;
      };
      herkenning.onerror = ev => {
        const uitleg = ev.error === "not-allowed" || ev.error === "service-not-allowed"
          ? "De browser mag de microfoon niet gebruiken. Sta het toe (Safari: Instellingen › Websites › Microfoon), of gebruik dicteren van de Mac: twee keer Fn."
          : ev.error === "no-speech" ? "Niets gehoord. Klik nog eens op de microfoon en spreek."
          : "Inspreken lukt niet (" + ev.error + "). Gebruik anders dicteren van de Mac: twee keer Fn.";
        meld(uitleg, 9);
        stop();
      };
      herkenning.onend = () => { herkenning = null; knop.classList.remove("aw-aan"); };
      try { herkenning.start(); knop.classList.add("aw-aan"); }
      catch (e) { meld("Inspreken lukt niet. Gebruik dicteren van de Mac: twee keer Fn.", 8); herkenning = null; }
    });
    return stop;
  }

  /* ---------------- het chatvenster ---------------- */

  function openVenster(el, aanwijzing) {
    if (claudeBezig()) { meld("Claude is bezig met de aanwijzingen; wacht tot dat klaar is."); return; }
    sluitVenster();

    const venster = document.createElement("div");
    venster.className = "aw-venster";
    venster.innerHTML = `
      <div class="aw-wat"></div>
      <div class="aw-gesprek" hidden></div>
      <div class="aw-invoer">
        <textarea placeholder="Wat moet hier veranderen? Typ, of klik op de microfoon."></textarea>
        <button type="button" class="aw-mic" title="Inspreken (nog eens klikken = stoppen)">🎤</button>
      </div>
      <div class="aw-opmaak">
        <div class="aw-rij">
          <span>Opmaak</span>
          <button type="button" class="aw-schakel" data-schakel="vet" title="Vet"><b>B</b></button>
          <button type="button" class="aw-schakel" data-schakel="cursief" title="Cursief"><i>I</i></button>
          <button type="button" class="aw-schakel" data-schakel="onderstreept" title="Onderstreept"><u>U</u></button>
          <button type="button" class="aw-wisopmaak" title="Alle opmaak van deze aanwijzing weghalen" style="padding:4px 8px;font-size:12px">Wis opmaak</button>
        </div>
        <div class="aw-rij" data-kleur="color"><span>Tekstkleur</span></div>
        <div class="aw-rij" data-kleur="background-color"><span>Vlakkleur</span></div>
        <div class="aw-rij aw-bereik">
          <label><input type="radio" name="aw-bereik" value="dit"> alleen dit onderdeel</label>
          <label><input type="radio" name="aw-bereik" value="alle"> <span class="aw-alle">alle gelijke</span></label>
        </div>
      </div>
      <div class="aw-klein aw-svguitleg" hidden>Opmaak kiezen kan niet in de tekening (die is ook het printblad); beschrijf het in woorden.</div>
      <div class="aw-knoppen">
        <button type="button" class="aw-annuleer">Annuleer</button>
        <button type="button" class="aw-hoofd aw-bewaar">Bewaar</button>
      </div>`;

    /* Drie soorten: een nieuwe aanwijzing; het laatste (nog niet verwerkte)
       bericht bewerken; of reageren op wat Claude deed of vroeg. */
    const soort = !aanwijzing ? "nieuw" : kanBewerken(aanwijzing) ? "bewerk" : "reageer";
    const wat = aanwijzing ? aanwijzing.onderdeel.omschrijving : omschrijving(el);
    venster.querySelector(".aw-wat").textContent = aanwijzing
      ? `Aanwijzing ${aanwijzing.nummer} · ${wat} · ${statusNaam(aanwijzing)}` : wat;
    const vak = venster.querySelector("textarea");

    let beginstijl = null;
    if (aanwijzing) {
      const eerder = soort === "bewerk" ? aanwijzing.gesprek.slice(0, -1) : aanwijzing.gesprek;
      if (eerder.length) {
        const g = venster.querySelector(".aw-gesprek");
        g.hidden = false;
        tekenGesprek(g, eerder);
      }
      if (soort === "bewerk") {
        // een getypte tekstwijziging hoort bij dit bericht: laten zien, niet in het tekstvak
        const tw = laatste(aanwijzing).tekstwijziging;
        if (tw) {
          const g = venster.querySelector(".aw-gesprek");
          g.hidden = false;
          const r = document.createElement("div");
          r.className = "aw-bericht aw-klein";
          r.textContent = `Tekst wijzigen: ‘${tw.oud}’ → ‘${tw.nieuw}’ (typ je in het Zaalboek zelf)`;
          g.appendChild(r);
        }
        vak.value = laatste(aanwijzing).tekst || "";
        beginstijl = laatste(aanwijzing).stijl || aanwijzing.stijl || null;
      } else {
        vak.placeholder = aanwijzing.status === "vraag"
          ? "Je antwoord op de vraag van Claude. Typ, of klik op de microfoon."
          : "Wat moet er nog anders? Typ, of klik op de microfoon.";
        venster.querySelector(".aw-bewaar").textContent = "Bewaar reactie";
      }
    }
    const pad = el ? cssPad(el) : (aanwijzing ? aanwijzing.onderdeel.cssPad : "");

    const v = {
      element: el,
      aanwijzing,
      soort,
      dom: venster,
      stijl: beginstijl ? JSON.parse(JSON.stringify(beginstijl))
                        : { bereik: "dit", selector: pad, eigenschappen: {} }
    };
    v.stopSpraak = koppelSpraak(venster.querySelector(".aw-mic"), vak);

    // opmaak alleen voor gewone onderdelen van de pagina, niet in de tekening
    const inTekening = el ? el instanceof SVGElement : (aanwijzing && /^(g|svg|rect|path|line|circle|text)$/.test(aanwijzing.onderdeel.tag));
    if (inTekening) {
      venster.querySelector(".aw-opmaak").hidden = true;
      venster.querySelector(".aw-svguitleg").hidden = false;
      v.stijl = null;
    } else {
      maakOpmaak(v);
    }

    venster.querySelector(".aw-annuleer").addEventListener("click", sluitVenster);
    venster.querySelector(".aw-bewaar").addEventListener("click", bewaarVenster);
    laag.appendChild(venster);
    staat.venster = v;

    const gesprek = venster.querySelector(".aw-gesprek");
    gesprek.scrollTop = gesprek.scrollHeight;

    // naast het onderdeel, maar binnen het scherm
    const r = el ? el.getBoundingClientRect()
                 : { left: aanwijzing.positie.x, top: aanwijzing.positie.y, right: aanwijzing.positie.x + aanwijzing.positie.breedte };
    const b = venster.offsetWidth, h = venster.offsetHeight;
    let x = r.right + 10, y = r.top;
    if (x + b > window.innerWidth - 8) x = Math.max(8, r.left - b - 10);
    if (x + b > window.innerWidth - 8) x = Math.max(8, window.innerWidth - b - 8);
    if (y + h > window.innerHeight - 8) y = Math.max(8, window.innerHeight - h - 8);
    venster.style.left = x + "px";
    venster.style.top = Math.max(8, y) + "px";

    if (el) toonRand(el);
    tekenVoorbeelden();
    vak.focus();
  }

  function maakOpmaak(v) {
    const venster = v.dom;
    const el = v.element;
    const s = v.stijl;

    const bijwerken = () => {
      venster.querySelectorAll("[data-schakel]").forEach(k => {
        const prop = SCHAKELAARS[k.dataset.schakel][0];
        k.classList.toggle("aw-aan", prop in s.eigenschappen);
      });
      venster.querySelectorAll(".aw-staal").forEach(k =>
        k.classList.toggle("aw-gekozen", s.eigenschappen[k.dataset.prop] === k.dataset.waarde));
      tekenVoorbeelden();
    };

    // vet, cursief, onderstreept: het tegenovergestelde van wat er nu staat
    const SCHAKELAARS = {
      vet:          ["font-weight",     cs => parseInt(cs.fontWeight, 10) >= 600 ? "400" : "700"],
      cursief:      ["font-style",      cs => cs.fontStyle === "italic" ? "normal" : "italic"],
      onderstreept: ["text-decoration", cs => cs.textDecorationLine.includes("underline") ? "none" : "underline"]
    };
    venster.querySelectorAll("[data-schakel]").forEach(knop => knop.addEventListener("click", () => {
      const [prop, tegendeel] = SCHAKELAARS[knop.dataset.schakel];
      if (prop in s.eigenschappen) delete s.eigenschappen[prop];
      else {
        const doel = el || document.querySelector(s.selector);
        s.eigenschappen[prop] = doel ? tegendeel(getComputedStyle(doel)) : tegendeel({ fontWeight: "400", fontStyle: "normal", textDecorationLine: "none" });
      }
      bijwerken();
    }));

    // kleuren: de kleuren van de app, en een vrije kleur
    const wortel = getComputedStyle(document.documentElement);
    venster.querySelectorAll("[data-kleur]").forEach(rij => {
      const prop = rij.dataset.kleur;
      const opties = KLEUREN.filter(([, n]) => wortel.getPropertyValue(n).trim())
        .map(([naam, n]) => [naam, `var(${n})`]).concat([["wit", "#ffffff"]]);
      opties.forEach(([naam, waarde]) => {
        const staal = document.createElement("button");
        staal.type = "button";
        staal.className = "aw-staal";
        staal.title = naam;
        staal.style.background = waarde;
        staal.dataset.prop = prop;
        staal.dataset.waarde = waarde;
        staal.addEventListener("click", () => {
          if (s.eigenschappen[prop] === waarde) delete s.eigenschappen[prop];
          else s.eigenschappen[prop] = waarde;
          bijwerken();
        });
        rij.appendChild(staal);
      });
      const vrij = document.createElement("input");
      vrij.type = "color";
      vrij.title = "Andere kleur";
      vrij.addEventListener("input", () => { s.eigenschappen[prop] = vrij.value; bijwerken(); });
      rij.appendChild(vrij);
    });

    venster.querySelector(".aw-wisopmaak").addEventListener("click", () => { s.eigenschappen = {}; bijwerken(); });

    // alleen dit onderdeel, of alle gelijke
    const gelijk = el ? gelijkeSelector(el) : (s.bereik === "alle" ? s.selector : null);
    const dit = el ? cssPad(el)
              : (v.aanwijzing && v.aanwijzing.onderdeel.cssPad) || (s.bereik === "dit" ? s.selector : null);
    const keuzes = venster.querySelectorAll("[name=aw-bereik]");
    keuzes.forEach(k => {
      k.checked = k.value === s.bereik;
      k.disabled = k.value === "alle" ? !gelijk : !dit;
      k.addEventListener("change", () => {
        s.bereik = k.value;
        s.selector = k.value === "alle" ? gelijk : dit;
        bijwerken();
      });
    });
    if (gelijk) {
      let aantal = 0;
      try { aantal = document.querySelectorAll(gelijk).length; } catch (e) {}
      venster.querySelector(".aw-alle").textContent = `alle gelijke (${aantal} nu op het scherm)`;
    } else {
      venster.querySelector(".aw-alle").textContent = "alle gelijke (niet mogelijk: geen klasse)";
    }

    bijwerken();
  }

  function sluitVenster() {
    if (!staat.venster) return;
    staat.venster.stopSpraak();
    staat.venster.dom.remove();
    staat.venster = null;
    if (!staat.modus) toonRand(null);
    tekenVoorbeelden();
  }

  function bewaarVenster() {
    const v = staat.venster;
    if (!v) return;
    const tekst = v.dom.querySelector("textarea").value.trim();
    const stijl = heeftStijl(v.stijl) ? v.stijl : null;
    // een tekstwijziging (getypt in het Zaalboek zelf) blijft bij het bewerken bewaard
    const wijziging = v.soort === "bewerk" ? laatste(v.aanwijzing).tekstwijziging : null;
    if (!tekst && !stijl && !wijziging) { sluitVenster(); return; }

    const bericht = { van: "marc", tekst, tijd: new Date().toISOString() };
    if (stijl) bericht.stijl = stijl;
    if (wijziging) bericht.tekstwijziging = wijziging;

    let a = v.aanwijzing;
    if (!a) {
      a = vastleggen(v.element);
      a.gesprek.push(bericht);
      staat.lijst.push(a);
    } else if (v.soort === "bewerk") {
      a.gesprek[a.gesprek.length - 1] = bericht;
    } else {
      a.gesprek.push(bericht);
      a.status = "open";
    }
    // a.stijl is het opmaakvoorbeeld van het verzoek dat nog verwerkt moet worden
    if (stijl) a.stijl = stijl; else delete a.stijl;
    // a.tekstwijziging idem: de nieuwe tekst als voorbeeld, tot Claude hem verwerkt
    if (wijziging) a.tekstwijziging = wijziging; else delete a.tekstwijziging;

    sluitVenster();
    staat.onderMuis = null;
    if (staat.modus) toonRand(null);
    bewaren();
  }

  /* ---------------- verwerken, goedkeuren, terugdraaien ---------------- */

  async function haalWijzigingen() {
    try { staat.wijzigingen = await (await fetch("/wijzigingen", { cache: "no-store" })).json(); }
    catch (e) { /* server weg: dat meldt ophalen() al */ }
    tekenAlles();
  }

  async function volgTaak() {
    let t;
    try { t = await (await fetch("/taak", { cache: "no-store" })).json(); }
    catch (e) { return; }
    const wasBezig = claudeBezig();
    staat.taak = t;
    if (t.bezig) setTimeout(volgTaak, 2000);
    else if (wasBezig) taakKlaar(t);
    tekenAlles();
  }

  async function start(adres) {
    let antwoord;
    try { antwoord = await fetch(adres, { method: "POST" }); }
    catch (e) { meld("De testserver is niet bereikbaar."); return null; }
    const uit = await antwoord.json().catch(() => ({}));
    if (!antwoord.ok) { meld(uit.message || "Dat lukte niet.", 12); return null; }
    return uit;
  }

  async function verwerk() {
    if (staat.venster) sluitVenster();
    zetModus(false);
    if (await start("/verwerk")) { staat.lijstOpen = true; volgTaak(); }
  }

  async function goedkeuren() {
    const w = staat.wijzigingen;
    if (!confirm("Deze wijzigingen live zetten op GitHub?\n\n" + w.bestanden.join("\n") +
                 "\n\nClaude controleert eerst wat er meegaat, en commit en pusht daarna naar main.")) return;
    if (await start("/goedkeuren")) volgTaak();
  }

  async function terugdraaien() {
    const w = staat.wijzigingen;
    if (!confirm("Alle wijzigingen die nog niet live staan opzij zetten?\n\n" + w.bestanden.join("\n") +
                 "\n\nZe zijn niet weg: ze staan in 'git stash' en zijn terug te halen.")) return;
    const uit = await start("/terugdraaien");
    if (uit) {
      sessionStorage.setItem(NA_HERLADEN, "Teruggedraaid. De aanwijzingen staan weer open; pas ze aan en verwerk ze opnieuw.");
      location.reload();
    }
  }

  function taakKlaar(t) {
    if (t.soort === "verwerken" && t.uitkomst !== "mislukt") {
      // de code is veranderd: herladen om het resultaat te zien
      sessionStorage.setItem(NA_HERLADEN, t.uitkomst === "gelukt"
        ? "Verwerkt. Niet tevreden? Klik op het groene speldje ✓ om te reageren. Wel goed? Kies in de Lijst ‘Goedkeuren en live zetten’."
        : "Deels verwerkt: Claude heeft een vraag. Klik op het blauwe speldje ? of kijk in de Lijst.");
      sessionStorage.setItem(NA_HERLADEN + "-lijst", "1");
      location.reload();
      return;
    }
    if (t.soort === "goedkeuren" && t.uitkomst === "gelukt") meld("Live gezet: gecommit en gepusht naar main.", 8);
    else meld("Dat is niet gelukt. Zie de uitleg in de Lijst.", 8);
    staat.lijstOpen = true;
    ophalen();
    haalWijzigingen();
  }

  function duur(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /* ---------------- de lijst ---------------- */

  function knop(tekst, klasse, actie, uit) {
    const k = document.createElement("button");
    k.type = "button";
    k.textContent = tekst;
    if (klasse) k.className = klasse;
    if (uit) k.disabled = true;
    k.addEventListener("click", actie);
    return k;
  }

  function tekenLijst() {
    let paneel = laag.querySelector(".aw-lijst");
    if (!staat.lijstOpen) { if (paneel) paneel.remove(); return; }
    if (!paneel) { paneel = document.createElement("div"); paneel.className = "aw-lijst"; laag.appendChild(paneel); }
    const scroll = paneel.scrollTop;
    paneel.innerHTML = "<h3>Aanwijzingen</h3>";

    const t = staat.taak;
    const bezig = claudeBezig();
    const open = staat.lijst.filter(a => a.status === "open").length;
    const w = staat.wijzigingen;

    // 1. verwerken
    const vak1 = document.createElement("div");
    vak1.className = "aw-vak";
    if (bezig) {
      const wat = t.soort === "verwerken" ? "Claude verwerkt de aanwijzingen" : "Claude controleert en zet live";
      vak1.innerHTML = `<b class="aw-klok"></b>`;
      vak1.querySelector(".aw-klok").textContent = `${wat}… ${duur(Date.now() - t.begin)}`;
    } else {
      vak1.appendChild(knop(`Verwerk ${open} open aanwijzing${open === 1 ? "" : "en"}`, "aw-hoofd", verwerk, !open));
      if (t && t.uitkomst === "mislukt" && t.samenvatting) {
        const pre = document.createElement("pre");
        pre.textContent = (t.soort === "goedkeuren" ? "Niet live gezet. " : "Verwerken mislukt. ") + t.samenvatting.slice(0, 900);
        vak1.appendChild(pre);
      }
    }
    paneel.appendChild(vak1);

    // 2. bekijken en live zetten
    if (w.bestanden.length || w.nietGepusht) {
      const vak2 = document.createElement("div");
      vak2.className = "aw-vak";
      const uitleg = document.createElement("div");
      uitleg.className = "aw-klein";
      uitleg.textContent = (w.bestanden.length ? "Gewijzigd, nog niet live: " + w.bestanden.join(", ") : "") +
                           (w.nietGepusht ? ` ${w.nietGepusht} commit(s) nog niet gepusht.` : "");
      vak2.appendChild(uitleg);
      const rij = document.createElement("div");
      rij.className = "aw-knoppen";
      rij.appendChild(knop("Terugdraaien", "", terugdraaien, bezig || !w.bestanden.length));
      rij.appendChild(knop("Goedkeuren en live zetten", "aw-hoofd", goedkeuren, bezig));
      vak2.appendChild(rij);
      paneel.appendChild(vak2);
    }

    if (!staat.lijst.length) {
      const leeg = document.createElement("div");
      leeg.className = "aw-leeg";
      leeg.textContent = "Nog geen aanwijzingen. Klik op Aanwijzen en daarna op een onderdeel.";
      paneel.appendChild(leeg);
      return;
    }

    // 3. de aanwijzingen, elk met hun gesprek
    staat.lijst.forEach(a => {
      const item = document.createElement("div");
      item.className = "aw-item" + (a.status === "verwerkt" ? " aw-verwerkt" : "");
      const kop = document.createElement("div");
      kop.className = "aw-wat";
      kop.textContent = `${a.nummer}. ${a.onderdeel.omschrijving} · ${a.scherm} · ${statusNaam(a)}`;
      item.appendChild(kop);
      tekenGesprek(item, a.gesprek);
      const openen = () => openVenster(zoekElement(a), a);
      item.appendChild(knop(kanBewerken(a) ? "Bewerk" : "Reageer", kanBewerken(a) ? "" : "aw-hoofd", openen, bezig));
      item.appendChild(document.createTextNode(" "));
      item.appendChild(knop("Verwijder", "", () => {
        if (a.status === "verwerkt" && !confirm("Deze aanwijzing verwijderen? De wijziging zelf blijft staan; die haal je weg met Terugdraaien.")) return;
        staat.lijst = staat.lijst.filter(x => x !== a);
        bewaren();
      }, bezig));
      paneel.appendChild(item);
    });

    const knoppen = document.createElement("div");
    knoppen.className = "aw-knoppen";
    knoppen.appendChild(knop("Wis alles", "", () => {
      if (!confirm("Alle aanwijzingen wissen?")) return;
      staat.lijst = [];
      bewaren();
    }, bezig));
    paneel.appendChild(knoppen);
    paneel.scrollTop = scroll;
  }

  /* ---------------- spelden op de onderdelen ----------------
     De tekening wordt na elke wijziging opnieuw gemaakt, dus de spelden
     zoeken hun onderdeel steeds opnieuw op via het CSS-pad. */

  function zoekElement(a) {
    try { return document.querySelector(a.onderdeel.cssPad); } catch (e) { return null; }
  }

  function zichtbaar(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 &&
           r.top < window.innerHeight && r.left < window.innerWidth;
  }

  function plaatsSpelden() {
    const open = staat.lijst;
    while (spelden.children.length > open.length) spelden.lastChild.remove();
    while (spelden.children.length < open.length) {
      const s = document.createElement("div");
      s.className = "aw-speld";
      s.addEventListener("click", () => {
        const a = staat.lijst.find(x => x.nummer === Number(s.dataset.nummer));
        if (a) openVenster(zoekElement(a), a);
      });
      spelden.appendChild(s);
    }
    const scherm = welkScherm();
    open.forEach((a, i) => {
      const s = spelden.children[i];
      const el = zoekElement(a);
      // De app tekent schermen opnieuw: de nieuwe tekst als voorbeeld terugzetten
      // (niet terwijl het venster van deze aanwijzing open is; dat doet het venster zelf).
      if (el && a.tekstwijziging && isOpen(a) && !(staat.typen && staat.typen.el === el) &&
          !(staat.venster && staat.venster.aanwijzing === a) &&
          eigenTekst(el) === a.tekstwijziging.oud) {
        zetEigenTekst(el, a.tekstwijziging.nieuw);
      }
      // alleen tonen op het scherm waar de aanwijzing gemaakt is
      if (a.scherm !== scherm || !zichtbaar(el)) { s.style.display = "none"; return; }
      const r = el.getBoundingClientRect();
      s.style.display = "flex";
      s.style.left = r.right + "px";
      s.style.top = r.top + "px";
      s.textContent = a.status === "vraag" ? "?" : a.status === "verwerkt" ? "✓" : a.nummer;
      s.classList.toggle("aw-speld-vraag", a.status === "vraag");
      s.classList.toggle("aw-speld-klaar", a.status === "verwerkt");
      s.dataset.nummer = a.nummer;
      const l = laatste(a);
      s.title = `${a.nummer}. ${statusNaam(a)}` + (l ? ` — ${l.van === "claude" ? "Claude" : "Jij"}: ${berichtTekst(l) || beschrijfStijl(l.stijl)}` : "");
    });
  }

  function tekenAlles() {
    const open = staat.lijst.filter(isOpen).length;
    let tekst = `Lijst (${open})`;
    if (claudeBezig()) tekst += " · Claude bezig…";
    else if (staat.wijzigingen.bestanden.length) tekst += " · nog niet live";
    if (staat.nietBewaard) tekst += " · niet bewaard";
    lijstknop.textContent = tekst;
    lijstknop.classList.toggle("aw-waarschuwing", staat.nietBewaard);
    tekenLijst();
    plaatsSpelden();
    tekenVoorbeelden();
  }

  /* ---------------- starten ---------------- */

  modusknop.addEventListener("click", () => zetModus(!staat.modus));
  lijstknop.addEventListener("click", () => {
    staat.lijstOpen = !staat.lijstOpen;
    if (staat.lijstOpen) haalWijzigingen();
    tekenAlles();
  });

  // De app tekent zichzelf steeds opnieuw; de spelden lopen gewoon mee.
  setInterval(() => {
    plaatsSpelden();
    plaatsTypen();
    // tekende de app de tekst opnieuw terwijl er getypt werd? Dan bewaren wat er stond.
    if (staat.typen && !staat.typen.plek.isConnected) stopTypen(true);
  }, 300);
  // de klok bij "Claude is bezig"
  setInterval(() => {
    const klok = laag.querySelector(".aw-klok");
    if (klok && claudeBezig()) klok.textContent = klok.textContent.replace(/\d+:\d\d$/, duur(Date.now() - staat.taak.begin));
  }, 1000);

  // Terug in het venster (bijvoorbeeld na werk in Claude Code): de nieuwste stand.
  window.addEventListener("focus", () => {
    if (staat.venster) return;
    ophalen();
    haalWijzigingen();
  });

  const naHerladen = sessionStorage.getItem(NA_HERLADEN);
  if (naHerladen) {
    sessionStorage.removeItem(NA_HERLADEN);
    meld(naHerladen, 10);
  }
  if (sessionStorage.getItem(NA_HERLADEN + "-lijst")) {
    sessionStorage.removeItem(NA_HERLADEN + "-lijst");
    staat.lijstOpen = true;
  }

  ophalen();
  haalWijzigingen();
  volgTaak();
})();
