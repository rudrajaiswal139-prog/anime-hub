// === CONFIG ===
const STORAGE_KEY = "myAnimeHub_v1";
const EDIT_PIN = "1234"; // <- change this later to your own PIN

// === STATE ===
let state = {
  profile: {
    name: "Anime Fan",
    avatarUrl: "",
  },
  anime: [], // list of anime entries
  bingo: {},
};

let editMode = false;
let currentFilter = "all";

// === UTIL ===
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state = Object.assign(state, parsed);
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function initialsFromName(name) {
  if (!name) return "AF";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// === PROFILE / EDIT MODE ===
function renderProfile() {
  const nameDisplay = document.getElementById("profile-name-display");
  const avatarEl = document.getElementById("profile-avatar");
  const editLabel = document.getElementById("edit-mode-label");
  const nameInput = document.getElementById("profile-name-input");
  const avatarInput = document.getElementById("profile-avatar-input");

  nameDisplay.textContent = state.profile.name || "Anime Fan";
  nameInput.value = state.profile.name || "";

  // Avatar
  avatarEl.innerHTML = "";
  if (state.profile.avatarUrl) {
    const img = document.createElement("img");
    img.src = state.profile.avatarUrl;
    img.alt = "Avatar";
    avatarEl.appendChild(img);
  } else {
    avatarEl.textContent = initialsFromName(state.profile.name);
  }
  avatarInput.value = state.profile.avatarUrl || "";

  editLabel.textContent = editMode ? "Edit mode" : "Read-only";
  editLabel.style.color = editMode ? "#4ade80" : "#facc15";
}

function setEditMode(on) {
  editMode = on;
  renderProfile();
}

// === QUOTE OF THE DAY ===
const QUOTES = [
  {
    text: "Whatever you lose, you’ll find it again. But what you throw away you’ll never get back.",
    meta: "Kenshin Himura – Rurouni Kenshin",
  },
  {
    text: "People’s lives don’t end when they die, it ends when they lose faith.",
    meta: "Itachi Uchiha – Naruto",
  },
  {
    text: "A lesson without pain is meaningless.",
    meta: "Edward Elric – Fullmetal Alchemist: Brotherhood",
  },
  {
    text: "We each need to find our own inspiration. Sometimes, it’s not easy.",
    meta: "Kikyō Seirei – Haikyuu!!",
  },
  {
    text: "It’s okay to feel depressed. It takes time to overcome things.",
    meta: "Makoto – Horimiya",
  },
];

function renderQuote() {
  const qEl = document.getElementById("quote-text");
  const mEl = document.getElementById("quote-meta");
  const idx = Math.floor(Math.random() * QUOTES.length);
  const q = QUOTES[idx];
  qEl.textContent = `"${q.text}"`;
  mEl.textContent = q.meta;
}

// === ANIME MODEL ===
function ensureAnimeArray() {
  if (!Array.isArray(state.anime)) state.anime = [];
}

function addOrUpdateAnime(entry) {
  ensureAnimeArray();
  const existingIndex = state.anime.findIndex(
    (a) => a.id && entry.id && a.id === entry.id && a.source === entry.source
  );
  if (existingIndex >= 0) {
    state.anime[existingIndex] = Object.assign(
      {},
      state.anime[existingIndex],
      entry
    );
  } else {
    state.anime.push(entry);
  }
  saveState();
  renderAnimeList();
  renderStatsAndRecs();
}

function removeAnime(localId) {
  ensureAnimeArray();
  state.anime = state.anime.filter((a) => a.localId !== localId);
  saveState();
  renderAnimeList();
  renderStatsAndRecs();
}

// Generate a local id for UI
function assignLocalIds() {
  ensureAnimeArray();
  state.anime.forEach((a, idx) => {
    if (!a.localId) a.localId = "local-" + idx + "-" + Date.now();
  });
}

// === RENDER LIST ===
function renderAnimeList() {
  assignLocalIds();
  const container = document.getElementById("anime-list");
  const emptyEl = document.getElementById("anime-empty");
  container.innerHTML = "";

  let filtered = state.anime;
  if (currentFilter !== "all") {
    filtered = filtered.filter((a) => a.status === currentFilter);
  }

  if (!filtered.length) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  filtered.forEach((anime) => {
    const card = createEl("div", "anime-card");

    const thumb = createEl("div", "anime-thumb");
    if (anime.imageUrl) {
      const img = document.createElement("img");
      img.src = anime.imageUrl;
      img.alt = anime.title;
      thumb.appendChild(img);
    }
    card.appendChild(thumb);

    const info = createEl("div", "anime-info");
    const titleRow = createEl("div");
    const title = createEl("h3", null, anime.title);
    titleRow.appendChild(title);
    const statusTag = createEl(
      "span",
      "tag-pill",
      anime.status ? anime.status.toUpperCase() : "UNKNOWN"
    );
    titleRow.appendChild(statusTag);
    info.appendChild(titleRow);

    const meta = createEl(
      "p",
      null,
      `${anime.type || "–"} • ${
        anime.airingStatus || "status?"
      } • Score: ${anime.score ?? "–"}`
    );
    info.appendChild(meta);

    const epText = createEl(
      "p",
      null,
      `Ep ${anime.episodesWatched || 0} / ${
        anime.totalEpisodes || "?"
      } (${anime.minutesPerEp || 24} min/ep)`
    );
    info.appendChild(epText);

    // Progress bar
    const progressWrap = createEl("div", "progress-bar-wrap");
    const progressBar = createEl("div", "progress-bar");
    const total =
      anime.totalEpisodes && anime.totalEpisodes > 0
        ? anime.totalEpisodes
        : null;
    let ratio = 0;
    if (total) {
      ratio = Math.min(1, (anime.episodesWatched || 0) / total);
    }
    progressBar.style.width = `${ratio * 100}%`;
    progressWrap.appendChild(progressBar);
    info.appendChild(progressWrap);

    // Tags
    if (anime.tags && anime.tags.length) {
      const tagsRow = createEl("div");
      anime.tags.forEach((t) => {
        if (!t) return;
        tagsRow.appendChild(createEl("span", "tag-pill", t));
      });
      info.appendChild(tagsRow);
    }

    // Actions
    const actions = createEl("div", "anime-actions");

    const plusBtn = createEl("button", "small", "+1 ep");
    plusBtn.disabled = !editMode;
    plusBtn.onclick = () => {
      if (!editMode) return;
      anime.episodesWatched = (anime.episodesWatched || 0) + 1;
      saveState();
      renderAnimeList();
      renderStatsAndRecs();
    };
    actions.appendChild(plusBtn);

    const statusSelect = document.createElement("select");
    ["watching", "rewatching", "completed", "on-hold", "dropped", "plan"].forEach(
      (st) => {
        const opt = document.createElement("option");
        opt.value = st;
        opt.textContent = st;
        if (anime.status === st) opt.selected = true;
        statusSelect.appendChild(opt);
      }
    );
    statusSelect.disabled = !editMode;
    statusSelect.onchange = () => {
      if (!editMode) return;
      anime.status = statusSelect.value;
      saveState();
      renderAnimeList();
      renderStatsAndRecs();
    };
    actions.appendChild(statusSelect);

    const removeBtn = createEl("button", "secondary small", "Remove");
    removeBtn.disabled = !editMode;
    removeBtn.onclick = () => {
      if (!editMode) return;
      removeAnime(anime.localId);
    };
    actions.appendChild(removeBtn);

    info.appendChild(actions);
    card.appendChild(info);

    container.appendChild(card);
  });
}

// === STATS & RECOMMENDATIONS ===
function renderStatsAndRecs() {
  ensureAnimeArray();
  let total = state.anime.length;
  let completed = state.anime.filter((a) => a.status === "completed").length;
  let episodes = state.anime.reduce(
    (sum, a) => sum + (a.episodesWatched || 0),
    0
  );
  let minutes = state.anime.reduce(
    (sum, a) =>
      sum + (a.episodesWatched || 0) * (a.minutesPerEp || 24),
    0
  );
  const hours = Math.round((minutes / 60) * 10) / 10;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-completed").textContent = completed;
  document.getElementById("stat-episodes").textContent = episodes;
  document.getElementById("stat-time").textContent = `${hours} hrs`;

  // genres
  const genreCounts = {};
  state.anime.forEach((a) => {
    if (!a.genres) return;
    a.genres.forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  let topGenre = "–";
  let max = 0;
  Object.entries(genreCounts).forEach(([g, c]) => {
    if (c > max) {
      max = c;
      topGenre = g;
    }
  });
  document.getElementById("stat-genre").textContent = topGenre;

  // simple recommendations: show up to 5 unseen anime from your top genre
  const recList = document.getElementById("recommendations");
  recList.innerHTML = "";
  if (topGenre === "–") {
    const li = createEl(
      "li",
      null,
      "Add some anime first to get recommendations."
    );
    recList.appendChild(li);
    return;
  }

  const candidates = state.anime.filter(
    (a) => a.genres && a.genres.includes(topGenre) && a.status !== "completed"
  );
  if (!candidates.length) {
    const li = createEl(
      "li",
      null,
      `No obvious picks yet. Try adding more ${topGenre} anime.`
    );
    recList.appendChild(li);
    return;
  }
  candidates.slice(0, 5).forEach((a) => {
    const li = createEl(
      "li",
      null,
      `${a.title} (${a.type || "?"}) – status: ${a.status}`
    );
    recList.appendChild(li);
  });
}

// === BINGO ===
const BINGO_ITEMS = [
  "Cried because of anime",
  "Watched 100+ episodes",
  "Simps for a character",
  "Pulled an all-nighter",
  "Rewatched a series",
  "Argued about best girl",
  "Read manga after anime",
  "Watched filler knowingly",
  "Memorized an opening",
];

function renderBingo() {
  const grid = document.getElementById("bingo-grid");
  grid.innerHTML = "";
  BINGO_ITEMS.forEach((text, idx) => {
    const id = "bingo-" + idx;
    const cell = createEl("div", "bingo-cell", text);
    const done = !!state.bingo[id];
    if (done) cell.classList.add("done");
    cell.onclick = () => {
      state.bingo[id] = !state.bingo[id];
      saveState();
      renderBingo();
    };
    grid.appendChild(cell);
  });
}

// === SEASONAL ANIME ===
async function loadSeason() {
  const listEl = document.getElementById("season-list");
  listEl.textContent = "Loading...";
  try {
    const res = await fetch("https://api.jikan.moe/v4/seasons/now");
    const data = await res.json();
    listEl.innerHTML = "";
    const items = data.data || [];
    if (!items.length) {
      listEl.textContent = "No data.";
      return;
    }
    items.slice(0, 30).forEach((a) => {
      const div = createEl(
        "div",
        "season-item",
        `${a.title} • ${a.type} • ${a.episodes || "?"} eps`
      );
      listEl.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    listEl.textContent = "Failed to load season.";
  }
}

// === SEARCH & DETAILS (Jikan) ===
async function searchAnime(query) {
  const res = await fetch(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(
      query
    )}&limit=5&order_by=score&sort=desc`
  );
  return res.json();
}

async function fetchAnimeFull(id) {
  const res = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
  return res.json();
}

async function fetchMangaByTitle(title) {
  const res = await fetch(
    `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(
      title
    )}&limit=1&order_by=score&sort=desc`
  );
  return res.json();
}

function renderSearchResults(list) {
  const container = document.getElementById("search-results");
  container.innerHTML = "";
  if (!list.length) {
    container.textContent = "No results.";
    return;
  }
  list.forEach((item) => {
    const el = createEl("div", "search-item");
    const left = createEl("div");
    left.textContent = `${item.title} • ${
      item.type
    } • ${item.episodes || "?"} eps • Score ${item.score ?? "?"}`;
    const btn = createEl("button", "small", "Details");
    btn.onclick = () => loadDetails(item.mal_id);
    el.appendChild(left);
    el.appendChild(btn);
    container.appendChild(el);
  });
}

async function loadDetails(id) {
  const panel = document.getElementById("search-details");
  panel.style.display = "block";
  panel.textContent = "Loading details...";

  try {
    const [animeRes, mangaRes] = await Promise.allSettled([
      fetchAnimeFull(id),
      // we call manga later once we know the title from animeRes
    ]);

    if (animeRes.status !== "fulfilled") throw new Error("Anime failed");
    const animeData = animeRes.value.data;

    // Basic manga search using same title
    let mangaInfo = null;
    try {
      const mangaRes = await fetchMangaByTitle(animeData.title);
      if (mangaRes && mangaRes.data && mangaRes.data.length) {
        const m = mangaRes.data[0];
        mangaInfo = {
          title: m.title,
          status: m.status,
          chapters: m.chapters,
          volumes: m.volumes,
        };
      }
    } catch (e) {
      console.warn("Manga search failed", e);
    }

    // Build panel
    panel.innerHTML = "";
    const header = createEl("div", "details-header");
    const poster = createEl("div", "details-poster");
    if (animeData.images && animeData.images.jpg) {
      const img = document.createElement("img");
      img.src = animeData.images.jpg.image_url;
      img.alt = animeData.title;
      poster.appendChild(img);
    }
    header.appendChild(poster);

    const main = createEl("div", "details-main");
    main.appendChild(createEl("h3", null, animeData.title));
    main.appendChild(
      createEl(
        "p",
        null,
        `${animeData.type} • ${animeData.episodes || "?"} eps • ${
          animeData.status
        } • Score ${animeData.score ?? "?"}`
      )
    );
    const genres = (animeData.genres || []).map((g) => g.name).join(", ");
    if (genres) {
      main.appendChild(createEl("p", null, `Genres: ${genres}`));
    }

    panel.appendChild(header);
    header.appendChild(main);

    // Watch order (basic: use relations)
    const watchOrderBox = createEl("div");
    watchOrderBox.appendChild(createEl("h4", null, "Watch order (basic):"));
    const rels = animeData.relations || [];
    if (!rels.length) {
      watchOrderBox.appendChild(
        createEl("p", null, "No related anime info found.")
      );
    } else {
      const list = createEl("ul");
      rels.forEach((rel) => {
        const entryType = rel.relation; // e.g. Sequel, Prequel
        rel.entry.forEach((e) => {
          const li = createEl(
            "li",
            null,
            `${entryType}: ${e.name} (${e.type})`
          );
          list.appendChild(li);
        });
      });
      watchOrderBox.appendChild(list);
    }
    panel.appendChild(watchOrderBox);

    // Manga info
    const mangaBox = createEl("div");
    mangaBox.appendChild(createEl("h4", null, "Manga info:"));
    if (mangaInfo) {
      mangaBox.appendChild(
        createEl(
          "p",
          null,
          `${mangaInfo.title} • ${mangaInfo.status || "status?"} • ${
            mangaInfo.chapters || "?"
          } chapters • ${mangaInfo.volumes || "?"} volumes`
        )
      );
    } else {
      mangaBox.appendChild(
        createEl(
          "p",
          null,
          "No manga match found or API failed. (Still, there might be a manga.)"
        )
      );
    }
    panel.appendChild(mangaBox);

    // Buttons: add to list
    const btnRow = createEl("div", "anime-actions");
    const addBtn = createEl(
      "button",
      null,
      "Add to my library (Watching)"
    );
    addBtn.disabled = !editMode;
    addBtn.onclick = () => {
      if (!editMode) return;
      const entry = {
        source: "jikan",
        id: animeData.mal_id,
        title: animeData.title,
        type: animeData.type,
        totalEpisodes: animeData.episodes || null,
        episodesWatched: 0,
        status: "watching",
        score: animeData.score,
        airingStatus: animeData.status,
        imageUrl:
          animeData.images && animeData.images.jpg
            ? animeData.images.jpg.image_url
            : "",
        minutesPerEp: 24,
        genres: (animeData.genres || []).map((g) => g.name),
        tags: [],
      };
      addOrUpdateAnime(entry);
      alert("Added to your library.");
    };
    btnRow.appendChild(addBtn);

    panel.appendChild(btnRow);
  } catch (e) {
    console.error(e);
    panel.textContent = "Failed to load details.";
  }
}

// === MANUAL ADD ===
function setupManualAdd() {
  const btn = document.getElementById("manual-add-button");
  btn.onclick = () => {
    if (!editMode) {
      alert("Unlock edit mode with your PIN first.");
      return;
    }
    const title = document.getElementById("manual-title").value.trim();
    const total = Number(document.getElementById("manual-total").value) || null;
    const mins =
      Number(document.getElementById("manual-minutes").value) || 24;
    const ep = Number(document.getElementById("manual-ep").value) || 0;
    const status = document.getElementById("manual-status").value;
    const tagsRaw = document
      .getElementById("manual-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!title) {
      alert("Title is required.");
      return;
    }

    const entry = {
      source: "manual",
      id: null,
      title,
      type: "Manual",
      totalEpisodes: total,
      episodesWatched: ep,
      status,
      score: null,
      airingStatus: null,
      imageUrl: "",
      minutesPerEp: mins,
      genres: [],
      tags: tagsRaw,
    };
    addOrUpdateAnime(entry);

    document.getElementById("manual-title").value = "";
    document.getElementById("manual-total").value = "";
    document.getElementById("manual-minutes").value = "";
    document.getElementById("manual-ep").value = "";
    document.getElementById("manual-tags").value = "";
  };
}

// === FILTER TABS ===
function setupTabs() {
  const tabs = document.querySelectorAll(".status-tab");
  tabs.forEach((tab) => {
    tab.onclick = () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      renderAnimeList();
    };
  });
}

// === PIN / PROFILE ===
function setupPinAndProfile() {
  const pinBtn = document.getElementById("pin-button");
  const pinLockBtn = document.getElementById("pin-lock-button");
  const pinInput = document.getElementById("pin-input");
  const saveProfileBtn = document.getElementById("profile-save-button");

  pinBtn.onclick = () => {
    const value = pinInput.value.trim();
    if (value === EDIT_PIN) {
      setEditMode(true);
      alert("Edit mode unlocked.");
    } else {
      alert("Wrong PIN.");
    }
    pinInput.value = "";
  };

  pinLockBtn.onclick = () => {
    setEditMode(false);
    alert("Edit mode locked.");
  };

  saveProfileBtn.onclick = () => {
    if (!editMode) {
      alert("Unlock edit mode first.");
      return;
    }
    const name = document.getElementById("profile-name-input").value.trim();
    const avatar = document
      .getElementById("profile-avatar-input")
      .value.trim();
    state.profile.name = name || "Anime Fan";
    state.profile.avatarUrl = avatar || "";
    saveState();
    renderProfile();
  };
}

// === SEARCH HANDLER ===
function setupSearch() {
  const btn = document.getElementById("search-button");
  const input = document.getElementById("search-input");
  btn.onclick = async () => {
    const q = input.value.trim();
    const container = document.getElementById("search-results");
    cons
