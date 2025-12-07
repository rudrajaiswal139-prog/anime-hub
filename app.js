// === CONFIG ===
const STORAGE_KEY = "myAnimeHub_v1";
const EDIT_PIN = "1234"; // change to your own later

// === STATE ===
let state = {
  profile: {
    name: "Anime Fan",
    avatarUrl: "",
  },
  anime: [],
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
  qEl.textContent = '"' + q.text + '"';
  mEl.textContent = q.meta;
}

// === ANIME MODEL ===
function ensureAnimeArray() {
  if (!Array.isArray(state.anime)) state.anime = [];
}

function assignLocalIds() {
  ensureAnimeArray();
  state.anime.forEach((a, idx) => {
    if (!a.localId) a.localId = "local-" + idx + "-" + Date.now();
  });
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

// === RENDER LIST ===
function renderAnimeList() {
  assignLocalIds();

  const container = document.getElementById("anime-list");
  const emptyEl = document.getElementById("anime-empty");
  container.innerHTML = "";

  let list = state.anime;
  if (currentFilter !== "all") {
    list = list.filter((a) => a.status === currentFilter);
  }

  if (!list.length) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  list.forEach((anime) => {
    const card = createEl("div", "anime-card");

    // thumbnail
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
      (anime.status || "unknown").toUpperCase()
    );
    titleRow.appendChild(statusTag);
    info.appendChild(titleRow);

    const meta = createEl(
      "p",
      null,
      (anime.type || "–") +
        " • " +
        (anime.airingStatus || "status?") +
        " • Score: " +
        (anime.score != null ? anime.score : "–")
    );
    info.appendChild(meta);

    const epsWatched = anime.episodesWatched || 0;
    const totalEps = anime.totalEpisodes || "?";
    const mins = anime.minutesPerEp || 24;

    const epText = createEl(
      "p",
      null,
      "Ep " + epsWatched + " / " + totalEps + " (" + mins + " min/ep)"
    );
    info.appendChild(epText);

    const progressWrap = createEl("div", "progress-bar-wrap");
    const progressBar = createEl("div", "progress-bar");
    if (typeof anime.totalEpisodes === "number" && anime.totalEpisodes > 0) {
      const ratio = Math.min(1, epsWatched / anime.totalEpisodes);
      progressBar.style.width = ratio * 100 + "%";
    } else {
      progressBar.style.width = "0%";
    }
    progressWrap.appendChild(progressBar);
    info.appendChild(progressWrap);

    if (anime.tags && anime.tags.length) {
      const tagsRow = createEl("div");
      anime.tags.forEach((t) => {
        tagsRow.appendChild(createEl("span", "tag-pill", t));
      });
      info.appendChild(tagsRow);
    }

    const actions = createEl("div", "anime-actions");

    const plusBtn = createEl("button", "small", "+1 ep");
    plusBtn.disabled = !editMode;
    plusBtn.onclick = function () {
      if (!editMode) return;
      anime.episodesWatched = (anime.episodesWatched || 0) + 1;
      saveState();
      renderAnimeList();
      renderStatsAndRecs();
    };
    actions.appendChild(plusBtn);

    const statusSelect = document.createElement("select");
    const statuses = [
      "watching",
      "rewatching",
      "completed",
      "on-hold",
      "dropped",
      "plan",
    ];
    statuses.forEach(function (st) {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (anime.status === st) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.disabled = !editMode;
    statusSelect.onchange = function () {
      if (!editMode) return;
      anime.status = statusSelect.value;
      saveState();
      renderAnimeList();
      renderStatsAndRecs();
    };
    actions.appendChild(statusSelect);

    const removeBtn = createEl("button", "secondary small", "Remove");
    removeBtn.disabled = !editMode;
    removeBtn.onclick = function () {
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

  var total = state.anime.length;
  var completed = state.anime.filter(function (a) {
    return a.status === "completed";
  }).length;
  var episodes = state.anime.reduce(function (sum, a) {
    return sum + (a.episodesWatched || 0);
  }, 0);
  var minutes = state.anime.reduce(function (sum, a) {
    return sum + (a.episodesWatched || 0) * (a.minutesPerEp || 24);
  }, 0);
  var hours = Math.round((minutes / 60) * 10) / 10;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-completed").textContent = completed;
  document.getElementById("stat-episodes").textContent = episodes;
  document.getElementById("stat-time").textContent = hours + " hrs";

  var genreCounts = {};
  state.anime.forEach(function (a) {
    if (!a.genres) return;
    a.genres.forEach(function (g) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  var topGenre = "–";
  var max = 0;
  Object.keys(genreCounts).forEach(function (g) {
    if (genreCounts[g] > max) {
      max = genreCounts[g];
      topGenre = g;
    }
  });
  document.getElementById("stat-genre").textContent = topGenre;

  var recList = document.getElementById("recommendations");
  recList.innerHTML = "";
  if (topGenre === "–") {
    recList.appendChild(
      createEl("li", null, "Add some anime first to get recommendations.")
    );
    return;
  }

  var candidates = state.anime.filter(function (a) {
    return a.genres && a.genres.indexOf(topGenre) !== -1 && a.status !== "completed";
  });

  if (!candidates.length) {
    recList.appendChild(
      createEl("li", null, "No obvious picks yet. Try adding more " + topGenre + " anime.")
    );
    return;
  }

  candidates.slice(0, 5).forEach(function (a) {
    recList.appendChild(
      createEl(
        "li",
        null,
        a.title + " (" + (a.type || "?") + ") – status: " + a.status
      )
    );
  });
}

// === BINGO ===
var BINGO_ITEMS = [
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
  var grid = document.getElementById("bingo-grid");
  grid.innerHTML = "";
  BINGO_ITEMS.forEach(function (text, idx) {
    var id = "bingo-" + idx;
    var cell = createEl("div", "bingo-cell", text);
    var done = !!state.bingo[id];
    if (done) cell.classList.add("done");
    cell.onclick = function () {
      state.bingo[id] = !state.bingo[id];
      saveState();
      renderBingo();
    };
    grid.appendChild(cell);
  });
}

// === SEASONAL ANIME (Jikan API) ===
function loadSeason() {
  var listEl = document.getElementById("season-list");
  listEl.textContent = "Loading...";
  fetch("https://api.jikan.moe/v4/seasons/now")
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      listEl.innerHTML = "";
      var items = data.data || [];
      if (!items.length) {
        listEl.textContent = "No data.";
        return;
      }
      items.slice(0, 30).forEach(function (a) {
        var div = createEl(
          "div",
          "season-item",
          a.title + " • " + a.type + " • " + (a.episodes || "?") + " eps"
        );
        listEl.appendChild(div);
      });
    })
    .catch(function () {
      listEl.textContent = "Failed to load season.";
    });
}

// === SEARCH + DETAILS (Jikan API) ===
function searchAnime(query) {
  return fetch(
    "https://api.jikan.moe/v4/anime?q=" +
      encodeURIComponent(query) +
      "&limit=5&order_by=score&sort=desc"
  ).then(function (res) {
    return res.json();
  });
}

function fetchAnimeFull(id) {
  return fetch("https://api.jikan.moe/v4/anime/" + id + "/full").then(function (res) {
    return res.json();
  });
}

function fetchMangaByTitle(title) {
  return fetch(
    "https://api.jikan.moe/v4/manga?q=" +
      encodeURIComponent(title) +
      "&limit=1&order_by=score&sort=desc"
  ).then(function (res) {
    return res.json();
  });
}

function renderSearchResults(list) {
  var container = document.getElementById("search-results");
  container.innerHTML = "";
  if (!list.length) {
    container.textContent = "No results.";
    return;
  }
  list.forEach(function (item) {
    var el = createEl("div", "search-item");
    var left = createEl(
      "div",
      null,
      item.title +
        " • " +
        item.type +
        " • " +
        (item.episodes || "?") +
        " eps • Score " +
        (item.score != null ? item.score : "?")
    );
    var btn = createEl("button", "small", "Details");
    btn.onclick = function () {
      loadDetails(item.mal_id);
    };
    el.appendChild(left);
    el.appendChild(btn);
    container.appendChild(el);
  });
}

function loadDetails(id) {
  var panel = document.getElementById("search-details");
  panel.style.display = "block";
  panel.textContent = "Loading details...";

  fetchAnimeFull(id)
    .then(function (animeRes) {
      var animeData = animeRes.data;
      if (!animeData) throw new Error("No anime data");

      return Promise.all([
        Promise.resolve(animeData),
        fetchMangaByTitle(animeData.title).catch(function () {
          return null;
        }),
      ]);
    })
    .then(function (results) {
      var animeData = results[0];
      var mangaRes = results[1];
      var mangaInfo = null;

      if (mangaRes && mangaRes.data && mangaRes.data.length) {
        var m = mangaRes.data[0];
        mangaInfo = {
          title: m.title,
          status: m.status,
          chapters: m.chapters,
          volumes: m.volumes,
        };
      }

      panel.innerHTML = "";

      var header = createEl("div", "details-header");
      var poster = createEl("div", "details-poster");
      if (animeData.images && animeData.images.jpg) {
        var img = document.createElement("img");
        img.src = animeData.images.jpg.image_url;
        img.alt = animeData.title;
        poster.appendChild(img);
      }
      header.appendChild(poster);

      var main = createEl("div", "details-main");
      main.appendChild(createEl("h3", null, animeData.title));
      main.appendChild(
        createEl(
          "p",
          null,
          animeData.type +
            " • " +
            (animeData.episodes || "?") +
            " eps • " +
            animeData.status +
            " • Score " +
            (animeData.score != null ? animeData.score : "?")
        )
      );
      var genres = (animeData.genres || []).map(function (g) {
        return g.name;
      });
      if (genres.length) {
        main.appendChild(createEl("p", null, "Genres: " + genres.join(", ")));
      }
      header.appendChild(main);
      panel.appendChild(header);

      // Watch order
      var watchBox = createEl("div");
      watchBox.appendChild(createEl("h4", null, "Watch order (basic):"));
      var rels = animeData.relations || [];
      if (!rels.length) {
        watchBox.appendChild(
          createEl("p", null, "No related anime info found.")
        );
      } else {
        var list = document.createElement("ul");
        rels.forEach(function (rel) {
          var relationType = rel.relation;
          (rel.entry || []).forEach(function (e) {
            var li = createEl(
              "li",
              null,
              relationType + ": " + e.name + " (" + e.type + ")"
            );
            list.appendChild(li);
          });
        });
        watchBox.appendChild(list);
      }
      panel.appendChild(watchBox);

      // Manga
      var mangaBox = createEl("div");
      mangaBox.appendChild(createEl("h4", null, "Manga info:"));
      if (mangaInfo) {
        mangaBox.appendChild(
          createEl(
            "p",
            null,
            mangaInfo.title +
              " • " +
              (mangaInfo.status || "status?") +
              " • " +
              (mangaInfo.chapters || "?") +
              " chapters • " +
              (mangaInfo.volumes || "?") +
              " volumes"
          )
        );
      } else {
        mangaBox.appendChild(
          createEl(
            "p",
            null,
            "No manga match found or API failed. (There still might be a manga.)"
          )
        );
      }
      panel.appendChild(mangaBox);

      // Add button
      var btnRow = createEl("div", "anime-actions");
      var addBtn = createEl(
        "button",
        null,
        "Add to my library (Watching)"
      );
      addBtn.disabled = !editMode;
      addBtn.onclick = function () {
        if (!editMode) return;
        var entry = {
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
          genres: genres,
          tags: [],
        };
        addOrUpdateAnime(entry);
        alert("Added to your library.");
      };
      btnRow.appendChild(addBtn);
      panel.appendChild(btnRow);
    })
    .catch(function (err) {
      console.error(err);
      panel.textContent = "Failed to load details.";
    });
}

// === MANUAL ADD ===
function setupManualAdd() {
  var btn = document.getElementById("manual-add-button");
  btn.onclick = function () {
    if (!editMode) {
      alert("Unlock edit mode with your PIN first.");
      return;
    }
    var title = document.getElementById("manual-title").value.trim();
    var total =
      Number(document.getElementById("manual-total").value) || null;
    var mins =
      Number(document.getElementById("manual-minutes").value) || 24;
    var ep = Number(document.getElementById("manual-ep").value) || 0;
    var status = document.getElementById("manual-status").value;
    var tagsRaw = document
      .getElementById("manual-tags")
      .value.split(",")
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean);

    if (!title) {
      alert("Title is required.");
      return;
    }

    var entry = {
      source: "manual",
      id: null,
      title: title,
      type: "Manual",
      totalEpisodes: total,
      episodesWatched: ep,
      status: status,
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
  var tabs = document.querySelectorAll(".status-tab");
  tabs.forEach(function (tab) {
    tab.onclick = function () {
      tabs.forEach(function (t) {
        t.classList.remove("active");
      });
      tab.classList.add("active");
      currentFilter = tab.getAttribute("data-filter");
      renderAnimeList();
    };
  });
}

// === PIN / PROFILE ===
function setupPinAndProfile() {
  var pinBtn = document.getElementById("pin-button");
  var pinLockBtn = document.getElementById("pin-lock-button");
  var pinInput = document.getElementById("pin-input");
  var saveProfileBtn = document.getElementById("profile-save-button");

  pinBtn.onclick = function () {
    var value = pinInput.value.trim();
    if (value === EDIT_PIN) {
      setEditMode(true);
      alert("Edit mode unlocked.");
    } else {
      alert("Wrong PIN.");
    }
    pinInput.value = "";
  };

  pinLockBtn.onclick = function () {
    setEditMode(false);
    alert("Edit mode locked.");
  };

  saveProfileBtn.onclick = function () {
    if (!editMode) {
      alert("Unlock edit mode first.");
      return;
    }
    va
