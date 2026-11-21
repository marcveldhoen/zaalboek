/* aanwijzer.js — het Aanwijzer-tooltje voor de lokale testopstelling.

   Alleen geladen in test-lokaal.html, nooit in index.html. Hiermee klik je in
   de app op een onderdeel en typ je erbij wat er moet veranderen. De
   aanwijzingen gaan naar de testserver (gereedschap/testserver.js), die ze
   bewaart in aanwijzingen.json. Daarna zeg je in Claude Code "verwerk de
   aanwijzingen".

   Bediening:
   - knop "Aanwijzen" rechtsonder (of de toets A met Shift) zet de aanwijsmodus
     aan en uit; Esc zet hem uit;
   - in de aanwijsmodus krijgt het onderdeel onder de muis een rand; klikken
     opent een chatvenstertje in plaats van dat de app reageert;
   - Enter bewaart, Shift+Enter is een nieuwe regel;
   - de knop met het aantal opent de lijst: bewerken, verwijderen, wissen.

   Het tooltje verandert niets aan de app zelf. Alles wat het toont staat in
   één eigen laag (#aanwijzer) die boven de app ligt. */

(function () {
  "use strict";

  const ADRES = "/aanwijzingen";
  const VANGNET = "zaalboek-aanwijzingen";      // localStorage, als de server weg is

  const staat = {
    lijst: [],
    modus: false,
    onderMuis: null,     // het element waar de muis nu op staat
    venster: null,       // { element, aanwijzing } van het open chatvenster
    lijstOpen: false,
    nietBewaard: false
  };

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
    #aanwijzer button:hover { background: #F2F1EC; }
    #aanwijzer .aw-balk .aw-aan { background: #D9480F; border-color: #D9480F; color: #fff; }
    #aanwijzer .aw-balk .aw-waarschuwing { border-color: #C92A2A; color: #C92A2A; }
    #aanwijzer .aw-venster, #aanwijzer .aw-lijst { position: fixed; background: #fff; border: 1px solid #C9C6BC;
      border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.18); pointer-events: auto; color: #232B2B; font-size: 13px; }
    #aanwijzer .aw-venster { width: 320px; padding: 10px; }
    #aanwijzer .aw-wat { font-size: 12px; color: #5A6462; margin-bottom: 6px; }
    #aanwijzer textarea { width: 100%; min-height: 72px; resize: vertical; font-size: 13px; padding: 6px;
      border: 1px solid #C9C6BC; border-radius: 5px; }
    #aanwijzer .aw-knoppen { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
    #aanwijzer .aw-knoppen .aw-hoofd { background: #2F6F6A; border-color: #2F6F6A; color: #fff; }
    #aanwijzer .aw-lijst { right: 16px; bottom: 60px; width: 380px; max-height: 60vh; overflow: auto; padding: 10px; }
    #aanwijzer .aw-lijst h3 { margin: 0 0 8px; font-size: 14px; }
    #aanwijzer .aw-item { border-top: 1px solid #E2E0D7; padding: 8px 0; }
    #aanwijzer .aw-item.aw-verwerkt .aw-tekst { text-decoration: line-through; color: #949C99; }
    #aanwijzer .aw-item .aw-tekst { white-space: pre-wrap; margin: 2px 0 6px; }
    #aanwijzer .aw-item button { padding: 3px 8px; font-size: 12px; }
    #aanwijzer .aw-leeg { color: #5A6462; }
    #aanwijzer .aw-speld { position: fixed; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
      background: #D9480F; color: #fff; font-size: 12px; font-weight: 600; display: flex; align-items: center;
      justify-content: center; pointer-events: auto; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
    #aanwijzer .aw-melding { position: fixed; right: 16px; bottom: 60px; background: #232B2B; color: #fff;
      padding: 8px 12px; border-radius: 6px; font-size: 13px; pointer-events: none; }
  `;
  document.head.appendChild(stijl);

  const laag = document.createElement("div");
  laag.id = "aanwijzer";
  laag.innerHTML = `
    <div class="aw-rand"></div>
    <div class="aw-label"></div>
    <div class="aw-spelden"></div>
    <div class="aw-balk">
      <button type="button" class="aw-lijstknop" title="Alle aanwijzingen">Lijst (0)</button>
      <button type="button" class="aw-modusknop" title="Klik daarna op een onderdeel (Shift+A)">Aanwijzen</button>
    </div>`;
  document.body.appendChild(laag);

  const rand      = laag.querySelector(".aw-rand");
  const label     = laag.querySelector(".aw-label");
  const spelden   = laag.querySelector(".aw-spelden");
  const lijstknop = laag.querySelector(".aw-lijstknop");
  const modusknop = laag.querySelector(".aw-modusknop");

  const vanOns = el => el instanceof Node && laag.contains(el);

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

  function vastleggen(el, tekst) {
    const r = el.getBoundingClientRect();
    const kruimel = document.getElementById("kruimel");
    return {
      nummer: staat.lijst.reduce((m, a) => Math.max(m, a.nummer || 0), 0) + 1,
      tijd: new Date().toISOString(),
      status: "open",
      tekst,
      scherm: welkScherm(),
      kruimelpad: kruimel ? Array.from(kruimel.children).map(k => k.textContent.trim()).filter(Boolean).join(" · ") : "",
      onderdeel: {
        omschrijving: omschrijving(el),
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        klassen: typeof el.className === "string" ? el.className : (el.getAttribute("class") || ""),
        tekst: korteTekst(el),
        data: dataKenmerken(el),
        cssPad: cssPad(el)
      },
      positie: { x: Math.round(r.left), y: Math.round(r.top), breedte: Math.round(r.width), hoogte: Math.round(r.height) },
      venster: { breedte: window.innerWidth, hoogte: window.innerHeight }
    };
  }

  /* ---------------- bewaren en ophalen ---------------- */

  async function ophalen() {
    try {
      const antwoord = await fetch(ADRES, { cache: "no-store" });
      if (!antwoord.ok) throw new Error(antwoord.status);
      staat.lijst = await antwoord.json();
      // was er nog iets dat niet bij de server aankwam? Dan dat bewaren.
      const vangnet = leesVangnet();
      if (vangnet && vangnet.nietBewaard) {
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
      const antwoord = await fetch(ADRES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staat.lijst)
      });
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
  function meld(tekst) {
    let m = laag.querySelector(".aw-melding");
    if (!m) { m = document.createElement("div"); m.className = "aw-melding"; laag.appendChild(m); }
    m.textContent = tekst;
    clearTimeout(meldingTijd);
    meldingTijd = setTimeout(() => m.remove(), 5000);
  }

  /* ---------------- de aanwijsmodus ---------------- */

  function zetModus(aan) {
    staat.modus = aan;
    modusknop.classList.toggle("aw-aan", aan);
    modusknop.textContent = aan ? "Aanwijzen (Esc = stoppen)" : "Aanwijzen";
    if (!aan) { staat.onderMuis = null; toonRand(null); }
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
    if (!staat.modus || staat.venster) return;
    const el = kiesOnderdeel(document.elementFromPoint(ev.clientX, ev.clientY));
    if (el !== staat.onderMuis) { staat.onderMuis = el; toonRand(el); }
  }, true);

  /* In de aanwijsmodus mag de app de klik niet krijgen: geen slepen, geen
     knop indrukken. Daarom worden deze gebeurtenissen al bij het venster
     onderschept, vóór de app ze ziet. Klikken op het tooltje zelf gaan door. */
  ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "contextmenu"].forEach(soort => {
    window.addEventListener(soort, ev => {
      if (!staat.modus || vanOns(ev.target)) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (soort === "pointerdown" && !staat.venster) {
        const el = kiesOnderdeel(document.elementFromPoint(ev.clientX, ev.clientY));
        if (el) openVenster(el, null);
      }
    }, true);
  });

  /* Toetsen: Esc stopt, Shift+A wisselt. Toetsen die in het tooltje getypt
     worden, gaan niet naar de app (anders zou Delete of R in de tekening iets
     doen). */
  window.addEventListener("keydown", ev => {
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

  /* ---------------- het chatvenster ---------------- */

  function openVenster(el, aanwijzing) {
    sluitVenster();
    const venster = document.createElement("div");
    venster.className = "aw-venster";
    const wat = aanwijzing ? aanwijzing.onderdeel.omschrijving : omschrijving(el);
    venster.innerHTML = `
      <div class="aw-wat"></div>
      <textarea placeholder="Wat moet hier veranderen?"></textarea>
      <div class="aw-knoppen">
        <button type="button" class="aw-annuleer">Annuleer</button>
        <button type="button" class="aw-hoofd aw-bewaar">Bewaar</button>
      </div>`;
    venster.querySelector(".aw-wat").textContent = (aanwijzing ? `Aanwijzing ${aanwijzing.nummer} · ` : "") + wat;
    const vak = venster.querySelector("textarea");
    if (aanwijzing) vak.value = aanwijzing.tekst;
    venster.querySelector(".aw-annuleer").addEventListener("click", sluitVenster);
    venster.querySelector(".aw-bewaar").addEventListener("click", bewaarVenster);
    laag.appendChild(venster);

    // naast het onderdeel, maar binnen het scherm
    const r = el ? el.getBoundingClientRect()
                 : { left: aanwijzing.positie.x, top: aanwijzing.positie.y, right: aanwijzing.positie.x, bottom: aanwijzing.positie.y };
    const b = venster.offsetWidth, h = venster.offsetHeight;
    let x = r.right + 10, y = r.top;
    if (x + b > window.innerWidth - 8) x = Math.max(8, r.left - b - 10);
    if (y + h > window.innerHeight - 8) y = Math.max(8, window.innerHeight - h - 8);
    venster.style.left = x + "px";
    venster.style.top = Math.max(8, y) + "px";

    staat.venster = { element: el, aanwijzing, dom: venster };
    if (el) toonRand(el);
    vak.focus();
  }

  function sluitVenster() {
    if (!staat.venster) return;
    staat.venster.dom.remove();
    staat.venster = null;
    if (!staat.modus) toonRand(null);
  }

  function bewaarVenster() {
    const v = staat.venster;
    if (!v) return;
    const tekst = v.dom.querySelector("textarea").value.trim();
    if (!tekst) { sluitVenster(); return; }
    if (v.aanwijzing) {
      v.aanwijzing.tekst = tekst;
      v.aanwijzing.status = "open";
    } else {
      staat.lijst.push(vastleggen(v.element, tekst));
    }
    sluitVenster();
    staat.onderMuis = null;
    if (staat.modus) toonRand(null);
    bewaren();
  }

  /* ---------------- de lijst ---------------- */

  function tekenLijst() {
    let paneel = laag.querySelector(".aw-lijst");
    if (!staat.lijstOpen) { if (paneel) paneel.remove(); return; }
    if (!paneel) { paneel = document.createElement("div"); paneel.className = "aw-lijst"; laag.appendChild(paneel); }
    paneel.innerHTML = "<h3>Aanwijzingen</h3>";

    if (!staat.lijst.length) {
      const leeg = document.createElement("div");
      leeg.className = "aw-leeg";
      leeg.textContent = "Nog geen aanwijzingen. Klik op Aanwijzen en daarna op een onderdeel.";
      paneel.appendChild(leeg);
      return;
    }

    staat.lijst.forEach(a => {
      const item = document.createElement("div");
      item.className = "aw-item" + (a.status === "verwerkt" ? " aw-verwerkt" : "");
      item.innerHTML = `<div class="aw-wat"></div><div class="aw-tekst"></div>
        <button type="button" class="aw-bewerk">Bewerk</button>
        <button type="button" class="aw-weg">Verwijder</button>`;
      item.querySelector(".aw-wat").textContent =
        `${a.nummer}. ${a.onderdeel.omschrijving} · ${a.scherm}` + (a.status === "verwerkt" ? " · verwerkt" : "");
      item.querySelector(".aw-tekst").textContent = a.tekst;
      item.querySelector(".aw-bewerk").addEventListener("click", () => openVenster(zoekElement(a), a));
      item.querySelector(".aw-weg").addEventListener("click", () => {
        staat.lijst = staat.lijst.filter(x => x !== a);
        bewaren();
      });
      paneel.appendChild(item);
    });

    const knoppen = document.createElement("div");
    knoppen.className = "aw-knoppen";
    knoppen.innerHTML = `<button type="button" class="aw-wisverwerkt">Wis verwerkte</button>
                         <button type="button" class="aw-wisalles">Wis alles</button>`;
    knoppen.querySelector(".aw-wisverwerkt").addEventListener("click", () => {
      staat.lijst = staat.lijst.filter(a => a.status !== "verwerkt");
      bewaren();
    });
    knoppen.querySelector(".aw-wisalles").addEventListener("click", () => {
      if (!confirm("Alle aanwijzingen wissen?")) return;
      staat.lijst = [];
      bewaren();
    });
    paneel.appendChild(knoppen);
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
    const open = staat.lijst.filter(a => a.status !== "verwerkt");
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
    open.forEach((a, i) => {
      const s = spelden.children[i];
      const el = zoekElement(a);
      // alleen tonen op het scherm waar de aanwijzing gemaakt is
      if (a.scherm !== welkScherm() || !zichtbaar(el)) { s.style.display = "none"; return; }
      const r = el.getBoundingClientRect();
      s.style.display = "flex";
      s.style.left = r.right + "px";
      s.style.top = r.top + "px";
      s.textContent = a.nummer;
      s.dataset.nummer = a.nummer;
      s.title = a.tekst;
    });
  }

  function tekenAlles() {
    const aantal = staat.lijst.filter(a => a.status !== "verwerkt").length;
    lijstknop.textContent = `Lijst (${aantal})` + (staat.nietBewaard ? " · niet bewaard" : "");
    lijstknop.classList.toggle("aw-waarschuwing", staat.nietBewaard);
    tekenLijst();
    plaatsSpelden();
  }

  /* ---------------- starten ---------------- */

  modusknop.addEventListener("click", () => zetModus(!staat.modus));
  lijstknop.addEventListener("click", () => { staat.lijstOpen = !staat.lijstOpen; tekenAlles(); });

  // De app tekent zichzelf steeds opnieuw; de spelden lopen gewoon mee.
  setInterval(plaatsSpelden, 400);

  // Claude kan aanwijzingen.json bijwerken terwijl de pagina openstaat
  // (status 'verwerkt'). Kom je terug in het venster, dan de nieuwste lijst.
  window.addEventListener("focus", () => { if (!staat.venster) ophalen(); });

  ophalen();
})();
