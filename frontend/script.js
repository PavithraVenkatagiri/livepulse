// ═══════════════════════════════════════════════
//  LivePulse v3.0 — Professional Feed Script
// ═══════════════════════════════════════════════

// ── Auth Guard ────────────────────────────────
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// ── Theme ─────────────────────────────────────
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
document.getElementById("themeBtn").textContent = savedTheme === "dark" ? "🌙" : "☀️";

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  document.getElementById("themeBtn").textContent = next === "dark" ? "🌙" : "☀️";
}

// ── Welcome ───────────────────────────────────
const username = localStorage.getItem("username") || "User";
document.getElementById("welcomeUser").textContent = username;

// ── Toast ─────────────────────────────────────
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = `toast toast-${type} show`;
  setTimeout(() => t.className = "toast", 3500);
}

// ── Push Notifications ────────────────────────
async function requestNotifPermission() {
  if (!("Notification" in window)) { showToast("Notifications not supported in this browser.", "error"); return; }
  const perm = await Notification.requestPermission();
  if (perm === "granted") showToast("Notifications enabled! You'll get alerts for breaking news.", "success");
  else showToast("Notifications blocked. You can enable them in browser settings.", "info");
}

function pushNotif(title, body, icon) {
  if (Notification.permission !== "granted") return;
  const n = new Notification("LivePulse — " + title, {
    body, icon: icon || "https://via.placeholder.com/64/3b82f6/white?text=LP",
    tag: "livepulse", silent: false
  });
  n.onclick = () => { window.focus(); n.close(); };
  setTimeout(() => n.close(), 6000);
}

// Auto request after 4 seconds
if (Notification.permission === "default") setTimeout(requestNotifPermission, 4000);

// ── Mobile Sidebar ────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("show");
}

// ── State ─────────────────────────────────────
const container    = document.getElementById("feedContainer");
let   allArticles  = [];
let   currentPage  = 1;
let   currentTopic = localStorage.getItem("interest") || "all";
let   hasMore      = false;

// ── Category Labels ───────────────────────────
const LABELS = {
  all:"All News", technology:"Technology & AI", sports:"Sports",
  education:"Education", music:"Music & Entertainment", politics:"Politics",
  business:"Business & Finance", health:"Health & Science",
  world:"World News", entertainment:"Movies & TV", space:"Space & Innovation",
  environment:"Environment & Climate", law:"Law & Justice", gaming:"Gaming",
  "jobs-it":"IT & Software Jobs", "jobs-health":"Healthcare Jobs",
  "jobs-education":"Education Jobs", "jobs-finance":"Finance Jobs",
  "jobs-engineering":"Engineering Jobs", "jobs-design":"Design Jobs",
  "jobs-data":"Data Science Jobs", "jobs-marketing":"Marketing Jobs",
  "jobs-legal":"Legal Jobs", "jobs-construction":"Construction Jobs"
};

// ── API Base URL (works on localhost AND deployed) ─
const API = window.location.hostname === "localhost"
  ? "https://livepulse-9i83.onrender.com"
  : window.location.origin;

// ── Socket.io ─────────────────────────────────
const socket = io(API);

socket.on("connect", () => socket.emit("subscribe", currentTopic));

socket.on("newUpdate", ({ article }) => {
  const grid = container.querySelector(".cards-grid");
  if (grid) {
    const card = createCard(article, currentTopic);
    card.classList.add("new-card");
    grid.prepend(card);
  }
  const badge = document.getElementById("liveBadge");
  badge.classList.add("live-flash");
  setTimeout(() => badge.classList.remove("live-flash"), 2000);
  showToast("Breaking: New article just arrived!", "info");
  pushNotif("New Article", article.title, article.urlToImage);
});

// ── Trending ──────────────────────────────────
async function loadTrending() {
  const panel = document.getElementById("trendingPanel");
  if (!panel) return;
  try {
    const res  = await fetch(`${API}/trending`, { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    if (!data.articles) return;
    panel.innerHTML = `<div class="trending-title">🔥 Trending Now</div>` +
      data.articles.map((a, i) => `
        <div class="trending-item" onclick="window.open('${a.url}','_blank')">
          <div class="trending-num">0${i + 1}</div>
          <div class="trending-item-title">${a.title}</div>
          <div class="trending-source">${a.source?.name || ""}</div>
        </div>`).join("");
  } catch { panel.innerHTML = '<div class="trending-title">🔥 Trending Now</div><p style="font-size:13px;color:var(--muted);padding:10px 0">Could not load trending.</p>'; }
}

// ── Skeleton ──────────────────────────────────
function showSkeletons() {
  let html = '<div class="skeleton-grid">';
  for (let i = 0; i < 9; i++) {
    html += `<div class="skeleton-card">
      <div class="skeleton sk-img"></div>
      <div class="sk-body">
        <div class="skeleton sk-line sk-w60" style="margin-bottom:10px"></div>
        <div class="skeleton sk-line sk-w100"></div>
        <div class="skeleton sk-line sk-w80"></div>
        <div class="skeleton sk-line sk-w60" style="margin-top:6px"></div>
      </div>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── Fetch News ────────────────────────────────
async function getUpdates(topic, page = 1) {
  document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById("btn-" + topic);
  if (btn) btn.classList.add("active");

  currentTopic = topic;
  currentPage  = page;

  document.getElementById("feedTitle").textContent = LABELS[topic] || "News Feed";
  socket.emit("subscribe", topic);

  if (page === 1) {
    showSkeletons();
    document.getElementById("loadMoreBtn").style.display = "none";
  }

  try {
    const res = await fetch(`${API}/updates/${topic}?page=${page}`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (res.status === 401 || res.status === 403) { logout(); return; }

    const data = await res.json();

    if (page === 1) {
      allArticles = data.articles || [];
      renderArticles(data.articles, topic);
    } else {
      allArticles = [...allArticles, ...(data.articles || [])];
      const grid = container.querySelector(".cards-grid");
      if (grid) data.articles.forEach(a => grid.appendChild(createCard(a, topic)));
    }

    hasMore = data.hasMore;
    document.getElementById("loadMoreBtn").style.display = hasMore ? "block" : "none";

    // Track reading
    trackRead(topic);

  } catch {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Connection error</div><div class="empty-sub">Make sure the server is running</div></div>`;
  }
}

// ── Load More ─────────────────────────────────
function loadMore() {
  getUpdates(currentTopic, currentPage + 1);
}

// ── Render Articles ───────────────────────────
function renderArticles(articles, topic) {
  if (!articles || articles.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No articles found</div><div class="empty-sub">Try a different category</div></div>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "cards-grid";
  articles.forEach(a => grid.appendChild(createCard(a, topic)));
  container.innerHTML = "";
  container.appendChild(grid);
}

// ── Create Card ───────────────────────────────
function createCard(article, topic) {
  const card     = document.createElement("div");
  card.className = "update-card";

  const time = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
    : "";

  const label = LABELS[topic] || topic || "";

  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${article.urlToImage || ''}" alt="" onerror="this.parentElement.style.display='none'"/>
      ${label ? `<div class="card-category-badge">${label}</div>` : ""}
    </div>
    <div class="card-content">
      <div class="card-source">${article.source?.name || article.source || ""}</div>
      <h3>${article.title || ""}</h3>
      <p>${article.description || ""}</p>
      <div class="card-footer">
        <span class="card-time">${time}</span>
        <button class="bookmark-btn" onclick="bookmarkArticle(event,this)"
          data-title="${encodeURIComponent(article.title||'')}"
          data-desc="${encodeURIComponent(article.description||'')}"
          data-url="${encodeURIComponent(article.url||'')}"
          data-img="${encodeURIComponent(article.urlToImage||'')}"
          data-source="${encodeURIComponent(article.source?.name||article.source||'')}"
          data-category="${encodeURIComponent(topic||'')}">
          🔖 Save
        </button>
      </div>
    </div>`;

  card.addEventListener("click", e => {
    if (!e.target.closest(".bookmark-btn")) window.open(article.url, "_blank");
  });

  return card;
}

// ── Bookmark ──────────────────────────────────
async function bookmarkArticle(e, btn) {
  e.stopPropagation();
  const article = {
    title:       decodeURIComponent(btn.dataset.title),
    description: decodeURIComponent(btn.dataset.desc),
    url:         decodeURIComponent(btn.dataset.url),
    urlToImage:  decodeURIComponent(btn.dataset.img),
    source:      decodeURIComponent(btn.dataset.source),
    category:    decodeURIComponent(btn.dataset.category),
  };
  try {
    const res  = await fetch(`${API}/bookmarks`, {
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(article)
    });
    const data = await res.json();
    if (res.ok) { btn.textContent = "✅ Saved"; btn.disabled = true; showToast("Article saved to bookmarks!", "success"); }
    else showToast(data.message || "Could not bookmark.", "error");
  } catch { showToast("Error saving bookmark.", "error"); }
}

// ── Show Bookmarks ────────────────────────────
async function showBookmarks() {
  document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("btn-bookmarks").classList.add("active");
  document.getElementById("feedTitle").textContent = "Saved Bookmarks";
  document.getElementById("loadMoreBtn").style.display = "none";
  showSkeletons();
  try {
    const res  = await fetch(`${API}/bookmarks`, { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    if (!data.bookmarks || data.bookmarks.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔖</div><div class="empty-title">No bookmarks yet</div><div class="empty-sub">Click the save button on any article</div></div>`;
      return;
    }
    const grid = document.createElement("div");
    grid.className = "cards-grid";
    data.bookmarks.forEach(a => grid.appendChild(createCard(a, a.category)));
    container.innerHTML = "";
    container.appendChild(grid);
  } catch { container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading bookmarks</div></div>`; }
}

// ── Search ────────────────────────────────────
function searchFeed() {
  const q = document.getElementById("searchBox").value.toLowerCase();
  if (!q) { renderArticles(allArticles, currentTopic); return; }
  const filtered = allArticles.filter(a =>
    a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
  );
  renderArticles(filtered, currentTopic);
}

// ── Track Read ────────────────────────────────
async function trackRead(category) {
  try {
    await fetch(`${API}/track-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ category })
    });
  } catch {}
}

// ── Keyboard Shortcuts ────────────────────────
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  if (e.key === "/") { e.preventDefault(); document.getElementById("searchBox").focus(); }
  if (e.key === "Escape") document.getElementById("searchBox").blur();
});

// ── Logout ────────────────────────────────────
function logout() {
  ["token","interest","username"].forEach(k => localStorage.removeItem(k));
  window.location.href = "login.html";
}

// ── Init ──────────────────────────────────────
getUpdates(localStorage.getItem("interest") || "all");
loadTrending();