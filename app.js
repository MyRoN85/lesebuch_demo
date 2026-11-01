// Lesebuch – webes demó (statikus, APK nélkül)
(() => {
  "use strict";

  const app = document.getElementById("app");
  const state = {
    menu: null,
    stories: null,
    novellas: null,
    situations: null,
    words: {},
    view: "home",
    level: "A1",
    section: null,
    book: null,
    situation: null,
    cursor: 1,
    picks: {},
    quiz: null,
  };

  // ---------- segédek ----------

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));

  const WORD_RE = /[\p{L}]+(?:['’\-][\p{L}]+)*/gu;

  function wrapWords(text) {
    let html = "";
    let last = 0;
    for (const match of text.matchAll(WORD_RE)) {
      html += escapeHtml(text.slice(last, match.index));
      html += `<span class="w" data-w="${escapeHtml(match[0].toLowerCase())}">${escapeHtml(match[0])}</span>`;
      last = match.index + match[0].length;
    }
    html += escapeHtml(text.slice(last));
    return html;
  }

  function meaning(raw) {
    const word = raw.toLowerCase().trim();
    if (state.words[word]) return state.words[word];
    const stems = [
      word.replace(/e$/, ""), word.replace(/en$/, ""), word.replace(/n$/, ""),
      word.replace(/er$/, ""), word.replace(/es$/, ""), word.replace(/s$/, ""),
      word.replace(/t$/, ""), word.replace(/em$/, ""), word.replace(/te$/, ""),
    ];
    for (const stem of stems) {
      if (stem.length > 2 && state.words[stem]) return state.words[stem];
    }
    return "";
  }

  const SCENES = {
    AMAZON: ["#2f6b52", "#173c2c"], SNOW: ["#7e97ad", "#2f4356"],
    TRAIN: ["#a4552e", "#5a2a17"], SEA: ["#3f7f97", "#1c4354"],
    DESERT: ["#c99a4a", "#7a5320"], CITY: ["#5b5f7a", "#292c3d"],
    FOREST: ["#55734f", "#2a3c26"], MOUNTAIN: ["#7b7f8a", "#3a3d46"],
    NIGHT: ["#3a4a70", "#161d30"], SUN: ["#d0a14a", "#8a5b1e"],
    LEAVES: ["#8a9a4f", "#4c5c2a"], FLOWERS: ["#c07a8a", "#6d3a46"],
    RAIN: ["#6b7f8f", "#333f4a"],
  };

  function coverMarkup(book, className = "cover") {
    if (book.coverImage) {
      return `<img class="${className}" src="${escapeHtml(book.coverImage)}" alt="">`;
    }
    const palette = SCENES[book.cover] || SCENES.LEAVES;
    return `<span class="${className} glyph" style="background:linear-gradient(160deg, ${palette[0]}, ${palette[1]})">📖</span>`;
  }

  const levelById = (id) => state.menu.levels.find((level) => level.id === id);
  const sectionById = (level, id) => level.sections.find((section) => section.id === id);

  const sectionSubtitle = (section) => {
    if (!section.enabled || section.count === 0) return "Hamarosan";
    const unit = section.id === "situations" ? "párbeszéd" : "történet";
    return `${section.count} ${unit}`;
  };

  // ---------- nézetek ----------

  function renderShell({ title, subtitle, back, chip, body }) {
    app.innerHTML = `
      <div class="topbar">
        ${back ? `<button class="back" data-back aria-label="Vissza">←</button>` : ""}
        <div>
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ""}
        </div>
        ${chip ? `<span class="chip">${escapeHtml(chip)}</span>` : ""}
      </div>
      ${body}`;
    window.scrollTo({ top: 0 });
  }

  function renderHome() {
    const levels = state.menu.levels.map((level) => {
      const locked = level.sections.every((section) => !section.enabled || section.count === 0);
      const open = level.id === state.level;
      const options = level.sections.map((section) => `
        <button class="option" data-section="${section.id}" ${section.enabled && section.count > 0 ? "" : "disabled"}>
          <span class="glyph">${section.id === "situations" ? "💬" : section.id === "stories" ? "📖" : "📚"}</span>
          <span class="text"><b>${escapeHtml(section.title)}</b><span>${escapeHtml(sectionSubtitle(section))}</span></span>
          <span class="arrow">›</span>
        </button>`).join("");
      return `
        <div class="level ${locked ? "locked" : ""}">
          <div class="level-head" ${locked ? "" : `data-level="${level.id}"`}>
            <h2>${escapeHtml(level.name)}</h2>
            <span class="de">${escapeHtml(level.subtitle)}</span>
            <span class="meta ${locked ? "soon" : ""}">${locked ? "Hamarosan" : "elérhető"}</span>
          </div>
          ${open && !locked ? `<div class="sections">${options}</div>` : ""}
        </div>`;
    }).join("");

    renderShell({
      title: "Lesebuch",
      subtitle: "",
      back: false,
      chip: "DEMÓ",
      body: `
        <div class="hero">
          <p class="tagline">Válassz szintet, majd egy olvasnivalót. Koppints a mondatra a magyarért, a szóra a jelentésért.</p>
        </div>
        <div class="demo-note">Ez egy demó: korlátozott tartalommal. A teljes app a Play Áruházban jelenik meg.</div>
        <div class="levels">${levels}</div>
        <div class="foot">Lesebuch demó · A1–B1 · német–magyar olvasó</div>`,
    });
  }

  function renderSection() {
    const level = levelById(state.level);
    const section = sectionById(level, state.section);
    if (!section || !section.enabled || section.count === 0) {
      renderShell({
        title: section ? section.title : "Hamarosan",
        subtitle: level.name,
        back: true,
        chip: "DEMÓ",
        body: `<div class="empty">Ez a rész a demóban még nem elérhető.<br>A teljes appban itt is lesz tartalom.</div>`,
      });
      return;
    }

    if (state.section === "situations") {
      const situations = state.situations.groups.flatMap((group) =>
        group.situations.map((situation) => ({ ...situation, group })));
      renderShell({
        title: "Mindennapi helyzetek",
        subtitle: `${level.name} · válassz egy párbeszédet`,
        back: true,
        chip: "DEMÓ",
        body: `<div class="list">${situations.map((situation) => `
          <button class="card" data-situation="${escapeHtml(situation.id)}">
            ${coverMarkup({ cover: "CITY" })}
            <span class="body">
              <b>${escapeHtml(situation.titleHu)}</b>
              <small>${escapeHtml(situation.titleDe)} · ${escapeHtml(situation.group.hu)}</small>
              <p>${escapeHtml(situation.subtitleDe || "")}</p>
            </span>
          </button>`).join("")}</div>`,
      });
      return;
    }

    if (state.section === "novellas") {
      const books = state.novellas.genres.flatMap((genre) => genre.books.map((book) => ({ ...book, genre })));
      renderShell({
        title: "Rövid történetek",
        subtitle: `${level.name} · válassz egy történetet`,
        back: true,
        chip: "DEMÓ",
        body: `<div class="list">${books.map((book) => `
          <button class="card" data-book="${escapeHtml(book.id)}">
            ${coverMarkup(book)}
            <span class="body">
              <b>${escapeHtml(book.titleHu)}</b>
              <small>${escapeHtml(book.titleDe)} · ${escapeHtml(book.seriesHu)}</small>
              <p>${escapeHtml(book.blurb)}</p>
            </span>
          </button>`).join("")}</div>`,
      });
      return;
    }

    const books = state.stories.books;
    renderShell({
      title: "Olvasmányok",
      subtitle: `${level.name} · ${books.length} történet`,
      back: true,
      chip: "DEMÓ",
      body: `<div class="grid">${books.map((book) => `
        <button class="book" data-book="${escapeHtml(book.id)}">
          ${coverMarkup(book)}
          <b>${escapeHtml(book.titleHu)}</b>
          <small>${escapeHtml(book.seriesHu)}</small>
          <p>${escapeHtml(book.blurb)}</p>
        </button>`).join("")}</div>`,
    });
  }

  function findBook(id) {
    const fromStories = state.stories.books.find((book) => book.id === id);
    if (fromStories) return { ...fromStories, kind: "story" };
    for (const genre of state.novellas.genres) {
      const book = genre.books.find((item) => item.id === id);
      if (book) return { ...book, kind: "novella", genre };
    }
    return null;
  }

  function renderReader(book) {
    const sentences = book.sentences.map((sentence) => `
      <p class="sent">${wrapWords(sentence.de)}<span class="hu">${escapeHtml(sentence.hu)}</span></p>`).join("");

    renderShell({
      title: book.titleHu,
      subtitle: book.titleDe,
      back: true,
      chip: book.kind === "novella" ? "RÖVID TÖRTÉNET" : "OLVASMÁNY",
      body: `
        <div class="reader">
          <div class="meta">${escapeHtml(book.seriesHu || "")}</div>
          <div class="toolbar">
            <button class="pill" data-toggle-hu>Magyar megjelenítése</button>
          </div>
          <div class="text">${sentences}</div>
          ${book.tip ? `<div class="tip"><b>Aha! tipp</b><br>${escapeHtml(book.tip)}</div>` : ""}
          <div class="foot">Koppints egy mondatra a magyarért · koppints egy szóra a jelentésért.</div>
        </div>
        <div class="sheet" id="sheet">
          <button class="close" data-close-sheet aria-label="Bezárás">×</button>
          <div class="word" id="sheet-word"></div>
          <div class="meaning" id="sheet-meaning"></div>
        </div>`,
    });
  }

  function renderDialogue() {
    const situation = state.situation;
    const turns = situation.turns;
    const picks = state.picks;

    // Nem választós fordulatok automatikusan megjelennek.
    while (state.cursor < turns.length && !turns[state.cursor].options?.length) {
      state.cursor += 1;
    }

    const visible = [];
    for (let index = 0; index < state.cursor; index += 1) {
      const turn = turns[index];
      if (turn.options?.length) {
        const pick = picks[index];
        if (pick) visible.push({ speaker: turn.speaker, de: pick.de, hu: pick.hu });
      } else if (turn.de) {
        visible.push(turn);
      }
    }

    const bubbles = visible.map((turn, index) => `
      <div class="bubble ${index % 2 === 0 ? "a" : "b"}">
        <span class="who">${escapeHtml(turn.speaker || "")}</span>
        ${escapeHtml(turn.de)}
        <span class="hu">${escapeHtml(turn.hu)}</span>
      </div>`).join("");

    const current = turns[state.cursor];
    const choice = current && current.options?.length
      ? `<div class="choice">
           <span class="label">Te válaszolsz · ${escapeHtml(current.speaker)}</span>
           ${current.options.map((option) => `
             <button data-choice="${escapeHtml(option.de)}">
               ${escapeHtml(option.de)}
               <span class="hu">${escapeHtml(option.hu)}</span>
             </button>`).join("")}
         </div>`
      : "";

    renderShell({
      title: situation.titleHu,
      subtitle: situation.titleDe,
      back: true,
      chip: "PÁRBESZÉD",
      body: `
        <div class="reader">
          <div class="toolbar">
            <button class="pill" data-toggle-hu>Magyar megjelenítése</button>
          </div>
          <div class="chat">${bubbles}</div>
          ${situation.tip ? `<div class="tip"><b>Aha! tipp</b><br>${escapeHtml(situation.tip)}</div>` : ""}
        </div>
        ${choice}`,
    });
  }

  // ---------- események ----------

  app.addEventListener("click", (event) => {
    const target = event.target;

    if (target.closest("[data-back]")) {
      if (state.view === "reader" || state.view === "dialogue") {
        state.view = "section";
        renderSection();
      } else {
        state.view = "home";
        renderHome();
      }
      return;
    }

    if (target.closest("[data-level]")) {
      state.level = target.closest("[data-level]").dataset.level;
      renderHome();
      return;
    }

    const sectionButton = target.closest("[data-section]");
    if (sectionButton) {
      state.section = sectionButton.dataset.section;
      state.view = "section";
      history.replaceState(null, "", "#/s/" + state.section);
      renderSection();
      return;
    }

    const bookButton = target.closest("[data-book]");
    if (bookButton) {
      const book = findBook(bookButton.dataset.book);
      if (book) {
        state.book = book;
        state.view = "reader";
        history.replaceState(null, "", "#/b/" + book.id);
        renderReader(book);
      }
      return;
    }

    const situationButton = target.closest("[data-situation]");
    if (situationButton) {
      const situation = state.situations.groups.flatMap((group) => group.situations)
        .find((item) => item.id === situationButton.dataset.situation);
      if (situation) {
        state.situation = situation;
        state.cursor = 1;
        state.picks = {};
        state.view = "dialogue";
        history.replaceState(null, "", "#/d/" + situation.id);
        renderDialogue();
      }
      return;
    }

    const choiceButton = target.closest("[data-choice]");
    if (choiceButton && state.situation) {
      const turns = state.situation.turns;
      const current = turns[state.cursor];
      const option = current.options.find((item) => item.de === choiceButton.dataset.choice);
      if (option) {
        state.picks[state.cursor] = option;
        state.cursor += 1;
        renderDialogue();
      }
      return;
    }

    if (target.closest("[data-close-sheet]")) {
      document.getElementById("sheet")?.classList.remove("open");
      return;
    }

    const toggle = target.closest("[data-toggle-hu]");
    if (toggle) {
      const container = document.querySelector(".text, .chat");
      if (container) {
        const on = container.classList.toggle("show-hu");
        toggle.classList.toggle("active", on);
        toggle.textContent = on ? "Magyar elrejtése" : "Magyar megjelenítése";
      }
      return;
    }

    const word = target.closest(".w");
    if (word) {
      event.stopPropagation();
      const sheet = document.getElementById("sheet");
      if (!sheet) return;
      const gloss = meaning(word.dataset.w);
      document.getElementById("sheet-word").textContent = word.textContent;
      document.getElementById("sheet-meaning").textContent =
        gloss || "Ehhez a szóhoz a demó szótára nem ad jelentést.";
      sheet.classList.add("open");
      return;
    }

    const sentence = target.closest(".sent");
    if (sentence) sentence.classList.toggle("open");

    const bubble = target.closest(".bubble");
    if (bubble) bubble.classList.toggle("open");
  });

  // ---------- indítás ----------

  async function loadJson(name) {
    const response = await fetch(`data/${name}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    return response.json();
  }

  // Egyszerű hash-útvonal: megosztható linkek és újratöltés-állóság.
  function applyHash() {
    const hash = location.hash.replace(/^#\/?/, "");
    if (hash.startsWith("s/")) {
      state.section = hash.slice(2);
      state.view = "section";
      renderSection();
      return;
    }
    if (hash.startsWith("b/")) {
      const book = findBook(hash.slice(2));
      if (book) {
        state.book = book;
        state.view = "reader";
        history.replaceState(null, "", "#/b/" + book.id);
        renderReader(book);
        return;
      }
    }
    if (hash.startsWith("d/")) {
      const situation = state.situations.groups
        .flatMap((group) => group.situations)
        .find((item) => item.id === hash.slice(2));
      if (situation) {
        state.situation = situation;
        state.cursor = 1;
        state.picks = {};
        state.view = "dialogue";
        renderDialogue();
        return;
      }
    }
    state.view = "home";
    renderHome();
  }

  window.addEventListener("hashchange", applyHash);

  async function start() {
    try {
      const [menu, stories, novellas, situations, words] = await Promise.all([
        loadJson("menu.json"),
        loadJson("stories.json"),
        loadJson("novellas.json"),
        loadJson("situations.json"),
        loadJson("words.json"),
      ]);
      state.menu = menu;
      state.stories = stories;
      state.novellas = novellas;
      state.situations = situations;
      state.words = words.words ?? {};
      applyHash();
    } catch (error) {
      app.innerHTML = `<div class="empty">A demó adatai nem töltődtek be.<br><small>${escapeHtml(error.message)}</small></div>`;
    }
  }

  start();
})();
