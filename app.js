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
    quiz: null,
  };

  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
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
      word.replace(/e$/, ""),
      word.replace(/en$/, ""),
      word.replace(/n$/, ""),
      word.replace(/er$/, ""),
      word.replace(/es$/, ""),
      word.replace(/s$/, ""),
      word.replace(/t$/, ""),
      word.replace(/em$/, ""),
      word.replace(/te$/, ""),
    ];
    for (const stem of stems) {
      if (stem.length > 2 && state.words[stem]) return state.words[stem];
    }
    return "";
  }

  const SCENES = {
    AMAZON: ["#2f6b52", "#173c2c"],
    SNOW: ["#7e97ad", "#2f4356"],
    TRAIN: ["#a4552e", "#5a2a17"],
    SEA: ["#3f7f97", "#1c4354"],
    DESERT: ["#c99a4a", "#7a5320"],
    CITY: ["#5b5f7a", "#292c3d"],
    FOREST: ["#55734f", "#2a3c26"],
    MOUNTAIN: ["#7b7f8a", "#3a3d46"],
    NIGHT: ["#3a4a70", "#161d30"],
    SUN: ["#d0a14a", "#8a5b1e"],
    LEAVES: ["#8a9a4f", "#4c5c2a"],
    FLOWERS: ["#c07a8a", "#6d3a46"],
    RAIN: ["#6b7f8f", "#333f4a"],
    BALCONY: ["#c2794a", "#6d3a1f"],
    WINDOW: ["#8fa9c0", "#3f5568"],
    CAFE: ["#a9764a", "#5a3a1f"],
    HOUSE: ["#8a8fa0", "#3c4050"],
    MUSIC: ["#8a6a9a", "#463254"],
    BOOK: ["#5f8a84", "#2b4a46"],
    MARKET: ["#c9a44e", "#6f4d1a"],
    LETTER: ["#b3a06a", "#5c4f28"],
  };

  const SCENE_ICONS = {
    AMAZON: "🌴",
    SNOW: "❄️",
    TRAIN: "🚂",
    SEA: "🌊",
    DESERT: "🌵",
    CITY: "🏙️",
    FOREST: "🌲",
    MOUNTAIN: "⛰️",
    NIGHT: "🌙",
    SUN: "☀️",
    LEAVES: "🍃",
    FLOWERS: "🌸",
    RAIN: "🌧️",
    BALCONY: "🪴",
    WINDOW: "🪟",
    CAFE: "☕",
    HOUSE: "🏠",
    MUSIC: "🎵",
    BOOK: "📖",
    MARKET: "🛒",
    LETTER: "✉️",
  };

  const coverIcon = (book) => SCENE_ICONS[book.cover] || "📖";

  function coverStyle(book) {
    const palette = SCENES[book.cover] || SCENES.LEAVES;
    return `background:linear-gradient(160deg, ${palette[0]}, ${palette[1]});`;
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
    const top = `
      <div class="topbar">
        ${back ? `<button class="back" data-back aria-label="Vissza">←</button>` : ""}
        <div>
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ""}
        </div>
        ${chip ? `<span class="chip">${escapeHtml(chip)}</span>` : ""}
      </div>`;
    app.innerHTML = top + body;
    window.scrollTo({ top: 0 });
  }

  function renderHome() {
    const levels = state.menu.levels
      .map((level) => {
        const locked = level.sections.every((section) => !section.enabled || section.count === 0);
        const open = level.id === state.level;
        const options = level.sections
          .map((section) => `
            <button class="option" data-section="${section.id}" ${section.enabled && section.count > 0 ? "" : "disabled"}>
              <span class="glyph">${section.id === "situations" ? "💬" : section.id === "stories" ? "📖" : "📚"}</span>
              <span class="text">
                <b>${escapeHtml(section.title)}</b>
                <span>${escapeHtml(sectionSubtitle(section))}</span>
              </span>
              <span class="arrow">›</span>
            </button>`)
          .join("");
        return `
          <div class="level ${locked ? "locked" : ""}">
            <div class="level-head" ${locked ? "" : `data-level="${level.id}"`}>
              <h2>${escapeHtml(level.name)}</h2>
              <span class="de">${escapeHtml(level.subtitle)}</span>
              <span class="meta ${locked ? "soon" : ""}">${locked ? "Hamarosan" : "elérhető"}</span>
            </div>
            ${open && !locked ? `<div class="sections">${options}</div>` : ""}
          </div>`;
      })
      .join("");

    renderShell({
      title: "Lesebuch",
      subtitle: "Németül olvasni – lépésről lépésre",
      back: false,
      chip: "DEMÓ",
      body: `
        <div class="hero">
          <p class="tagline">Válassz szintet, majd egy olvasnivalót. Koppints a mondatra a magyarért, a szóra a jelentésért.</p>
        </div>
        <div class="demo-note">
          Ez egy demó: korlátozott tartalommal. A teljes app a Play Áruházban jelenik meg.
        </div>
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
            <span class="cover" style="${coverStyle({ cover: "CITY" })}">💬</span>
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
            <span class="cover" style="${coverStyle(book)}">${coverIcon(book)}</span>
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
          <span class="cover" style="${coverStyle(book)}">${coverIcon(book)}</span>
          <b>${escapeHtml(book.titleHu)}</b>
          <small>${escapeHtml(book.seriesHu)}</small>
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
    const sentences = book.sentences
      .map((sentence) => `
        <p class="sent">
          ${wrapWords(sentence.de)}
          <span class="hu">${escapeHtml(sentence.hu)}</span>
        </p>`)
      .join("");

    renderShell({
      title: "Lesebuch",
      subtitle: "",
      back: true,
      chip: book.kind === "novella" ? "RÖVID TÖRTÉNET" : "OLVASMÁNY",
      body: `
        <div class="reader">
          <div class="meta">${escapeHtml(book.seriesHu || "")}</div>
          <h2 class="title">${escapeHtml(book.titleHu)}</h2>
          <div class="meta">${escapeHtml(book.titleDe)}</div>
          <div class="toolbar">
            <button class="pill" data-toggle-hu>Magyar megjelenítése</button>
            <button class="pill" data-quiz="word">Kvíz</button>
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

  function renderDialogue(situation) {
    const bubbles = (situation.turns || [])
      .map((turn, index) => `
        <div class="bubble ${index % 2 === 0 ? "a" : "b"}">
          <span class="who">${escapeHtml(turn.speaker || "")}</span>
          ${escapeHtml(turn.de)}
          <span class="hu">${escapeHtml(turn.hu)}</span>
        </div>`)
      .join("");

    renderShell({
      title: situation.titleHu,
      subtitle: situation.titleDe,
      back: true,
      chip: "PÁRBESZÉD",
      body: `
        <div class="reader">
          <div class="toolbar">
            <button class="pill" data-toggle-hu>Magyar megjelenítése</button>
            <button class="pill" data-quiz="situation">Kvíz</button>
          </div>
          <div class="chat">${bubbles}</div>
          ${situation.tip ? `<div class="tip"><b>Aha! tipp</b><br>${escapeHtml(situation.tip)}</div>` : ""}
        </div>`,
    });
  }

  // ---------- kvíz ----------

  const MAX_QUESTIONS = 8;

  function pickWords(book) {
    const seen = new Map();
    for (const sentence of book.sentences) {
      for (const match of sentence.de.matchAll(WORD_RE)) {
        const word = match[0].toLowerCase();
        if (word.length >= 4 && state.words[word] && !seen.has(word)) {
          seen.set(word, match[0]);
        }
      }
    }
    return [...seen.entries()].map(([key, display]) => ({ key, display }));
  }

  function buildWordQuiz(book) {
    // A zavaró opciókhoz csak tiszta, kisbetűs, rövid jelentések kellenek
    // (nincs bennük zárójeles alapszó, és nem tulajdonnevek).
    const allMeanings = Object.values(state.words).filter(
      (meaning) =>
        meaning &&
        meaning.length <= 40 &&
        !meaning.includes("(") &&
        !/^[A-ZÁÉÍÓÖŐÚÜŰ]/.test(meaning)
    );
    return shuffle(pickWords(book))
      .slice(0, MAX_QUESTIONS)
      .map(({ key, display }) => {
        const correct = state.words[key];
        const options = new Set([correct]);
        let guard = 0;
        while (options.size < 4 && guard < 300) {
          guard += 1;
          const candidate = allMeanings[Math.floor(Math.random() * allMeanings.length)];
          if (candidate && candidate !== correct) options.add(candidate);
        }
        return { prompt: display, correct, options: shuffle([...options]) };
      });
  }

  function buildSituationQuiz(situation) {
    const phrases = (situation.phrases || []).filter((phrase) => phrase.de && phrase.hu);
    return shuffle(phrases)
      .slice(0, 6)
      .map((phrase) => {
        const others = shuffle(phrases.filter((item) => item.de !== phrase.de)).slice(0, 3);
        return {
          prompt: phrase.hu,
          correct: phrase.de,
          options: shuffle([phrase.de, ...others.map((item) => item.de)]),
        };
      });
  }

  function startQuiz(kind, source) {
    const questions =
      kind === "word" ? buildWordQuiz(source) : buildSituationQuiz(source);
    if (questions.length === 0) return;
    state.quiz = {
      kind,
      source,
      questions,
      index: 0,
      score: 0,
      answered: null,
    };
    state.view = "quiz";
    renderQuiz();
  }

  function renderQuiz() {
    const quiz = state.quiz;
    if (!quiz) {
      renderHome();
      return;
    }

    if (quiz.index >= quiz.questions.length) {
      renderShell({
        title: "Kvíz",
        subtitle: quiz.kind === "word" ? "Szavak" : "Párbeszéd",
        back: true,
        chip: "DEMÓ",
        body: `
          <div class="result">
            <p>Eredmény</p>
            <div class="score">${quiz.score} / ${quiz.questions.length}</div>
            <p>${quiz.score === quiz.questions.length ? "Hibátlan!" : "Jó gyakorlás — menj tovább a következő történetre!"}</p>
            <div class="toolbar" style="justify-content:center">
              <button class="pill primary" data-restart>Újra</button>
              <button class="pill" data-back>Vissza</button>
            </div>
          </div>`,
      });
      return;
    }

    const question = quiz.questions[quiz.index];
    const answered = quiz.answered;

    const options = question.options
      .map((option) => {
        let cls = "answer";
        if (answered !== null) {
          if (option === question.correct) cls += " correct";
          else if (option === answered) cls += " wrong";
        }
        return `<button class="${cls}" data-answer="${escapeHtml(option)}">${escapeHtml(option)}</button>`;
      })
      .join("");

    const feedback =
      answered === null
        ? "&nbsp;"
        : answered === question.correct
          ? "Helyes!"
          : `Nem talált. A helyes: „${escapeHtml(question.correct)}”.`;

    renderShell({
      title: "Kvíz",
      subtitle: quiz.kind === "word" ? "Mit jelent ez a szó?" : "Melyik német mondat jelenti ezt?",
      back: true,
      chip: "DEMÓ",
      body: `
        <div class="quiz">
          <div class="progress">${quiz.index + 1} / ${quiz.questions.length} · ${quiz.score} pont</div>
          <div class="prompt">${quiz.kind === "word" ? "Szó:" : "Magyar mondat:"}</div>
          <div class="word">${escapeHtml(question.prompt)}</div>
          <div class="answers">${options}</div>
          <div class="feedback">${feedback}</div>
          <div class="actions">${answered !== null ? '<button class="pill primary" data-next>Következő</button>' : ""}</div>
        </div>`,
    });
  }

  // ---------- események ----------

  app.addEventListener("click", (event) => {
    const target = event.target;

    if (target.closest("[data-back]")) {
      if (state.view === "quiz" && state.quiz) {
        if (state.quiz.kind === "word" && state.quiz.source.sentences) {
          state.view = "reader";
          renderReader(state.quiz.source);
        } else {
          state.view = "dialogue";
          renderDialogue(state.quiz.source);
        }
        return;
      }
      if (state.view === "reader" || state.view === "dialogue") {
        state.view = "section";
        renderSection();
      } else {
        state.view = "home";
        renderHome();
      }
      return;
    }

    const quizButton = target.closest("[data-quiz]");
    if (quizButton) {
      if (quizButton.dataset.quiz === "word" && state.book) {
        startQuiz("word", state.book);
      } else if (state.situation) {
        startQuiz("situation", state.situation);
      }
      return;
    }

    if (state.view === "quiz" && state.quiz) {
      const answerButton = target.closest("[data-answer]");
      if (answerButton && state.quiz.answered === null) {
        const answer = answerButton.dataset.answer;
        state.quiz.answered = answer;
        if (answer === state.quiz.questions[state.quiz.index].correct) {
          state.quiz.score += 1;
        }
        renderQuiz();
        return;
      }

      if (target.closest("[data-next]")) {
        state.quiz.index += 1;
        state.quiz.answered = null;
        renderQuiz();
        return;
      }

      if (target.closest("[data-restart]")) {
        state.quiz.index = 0;
        state.quiz.score = 0;
        state.quiz.answered = null;
        state.quiz.questions =
          state.quiz.kind === "word"
            ? buildWordQuiz(state.quiz.source)
            : buildSituationQuiz(state.quiz.source);
        renderQuiz();
        return;
      }
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
      history.replaceState(null, "", `#/s/${state.section}`);
      renderSection();
      return;
    }

    const bookButton = target.closest("[data-book]");
    if (bookButton) {
      const book = findBook(bookButton.dataset.book);
      if (book) {
        state.book = book;
        state.view = "reader";
        history.replaceState(null, "", `#/b/${book.id}`);
        renderReader(book);
      }
      return;
    }

    const situationButton = target.closest("[data-situation]");
    if (situationButton) {
      const situation = state.situations.groups
        .flatMap((group) => group.situations)
        .find((item) => item.id === situationButton.dataset.situation);
      if (situation) {
        state.situation = situation;
        state.view = "dialogue";
        history.replaceState(null, "", `#/d/${situation.id}`);
        renderDialogue(situation);
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
        state.view = "dialogue";
        renderDialogue(situation);
        return;
      }
    }
    if (hash.startsWith("qword/")) {
      const book = findBook(hash.slice(6));
      if (book) {
        state.book = book;
        startQuiz("word", book);
        return;
      }
    }
    if (hash.startsWith("qsit/")) {
      const situation = state.situations.groups
        .flatMap((group) => group.situations)
        .find((item) => item.id === hash.slice(5));
      if (situation) {
        state.situation = situation;
        startQuiz("situation", situation);
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
