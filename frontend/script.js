// ──────────────────────────────────────────────
//  Auth Guard — redirect to login if no token
// ──────────────────────────────────────────────

const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

// Show welcome message
const username = localStorage.getItem("username") || "User";
document.getElementById("welcomeUser").textContent = "Hi, " + username;

// ──────────────────────────────────────────────
//  Variables
// ──────────────────────────────────────────────

const container   = document.getElementById("feedContainer");
const loadingMsg  = document.getElementById("loadingMsg");
let   allArticles = []; // store current articles for search

// ──────────────────────────────────────────────
//  Socket.io — Real-time Updates
// ──────────────────────────────────────────────

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  const interest = localStorage.getItem("interest") || "all";
  socket.emit("subscribe", interest);
});

socket.on("newUpdate", ({ article }) => {
  // Prepend new article to the top of the feed
  const card = createCard(article);
  card.classList.add("new-card");
  container.prepend(card);

  // Flash the live indicator
  const dot = document.getElementById("liveIndicator");
  dot.classList.add("live-flash");
  setTimeout(() => dot.classList.remove("live-flash"), 1000);
});

// ──────────────────────────────────────────────
//  Fetch News
// ──────────────────────────────────────────────

async function getUpdates(topic) {
  // Highlight active button
  document.querySelectorAll(".sidebar button").forEach((btn) => btn.classList.remove("active"));
  const activeBtn = document.getElementById("btn-" + topic);
  if (activeBtn) activeBtn.classList.add("active");

  // Update feed title
  document.getElementById("feedTitle").textContent =
    topic === "all" ? "Live Feed" : topic.charAt(0).toUpperCase() + topic.slice(1);

  // Show loading
  loadingMsg.style.display = "block";
  container.innerHTML      = "";

  // Subscribe to live updates for this topic
  socket.emit("subscribe", topic);

  try {
    const response = await fetch(`http://localhost:5000/updates/${topic}`, {
      headers: { Authorization: "Bearer " + token },
    });

    if (response.status === 401 || response.status === 403) {
      logout();
      return;
    }

    const data = await response.json();

    loadingMsg.style.display = "none";

    if (!data.articles || data.articles.length === 0) {
      container.innerHTML = '<p class="no-results">No articles found for this topic.</p>';
      return;
    }

    allArticles = data.articles.slice(0, 10);
    renderArticles(allArticles);

  } catch (err) {
    loadingMsg.style.display = "none";
    container.innerHTML = '<p class="no-results">Error loading feed. Is the server running?</p>';
  }
}

// ──────────────────────────────────────────────
//  Render Articles
// ──────────────────────────────────────────────

function renderArticles(articles) {
  container.innerHTML = "";

  if (articles.length === 0) {
    container.innerHTML = '<p class="no-results">No matching articles found.</p>';
    return;
  }

  articles.forEach((article) => {
    container.appendChild(createCard(article));
  });
}

function createCard(article) {
  const card = document.createElement("div");
  card.className = "update-card";

  card.innerHTML = `
    <img src="${article.urlToImage}" alt="${article.title}" onerror="this.style.display='none'" />
    <div class="card-content">
      <h3>${article.title}</h3>
      <p>${article.description}</p>
      <span class="card-source">${article.source?.name || ""}</span>
    </div>
  `;

  card.onclick = () => window.open(article.url, "_blank");
  return card;
}

// ──────────────────────────────────────────────
//  Search
// ──────────────────────────────────────────────

function searchFeed() {
  const query = document.getElementById("searchBox").value.toLowerCase();
  const filtered = allArticles.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
  );
  renderArticles(filtered);
}

// ──────────────────────────────────────────────
//  Logout
// ──────────────────────────────────────────────

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("interest");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

// ──────────────────────────────────────────────
//  Auto-load on page start
// ──────────────────────────────────────────────

const savedInterest = localStorage.getItem("interest") || "all";
getUpdates(savedInterest);
