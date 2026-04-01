require("dotenv").config();

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const mongoose   = require("mongoose");
const cors       = require("cors");
const path       = require("path");
const axios      = require("axios");

const authRoutes = require("./routes/auth");
const newsRoutes = require("./routes/news");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

app.use("/", authRoutes);
app.use("/", newsRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found." }));
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ message: "Internal server error." });
});

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);
  socket.on("subscribe", (topic) => {
    socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r); });
    socket.join(topic);
  });
  socket.on("disconnect", () => console.log("🔴 Disconnected:", socket.id));
});

const LIVE_TOPICS = ["technology","sports","politics","business","health","world","entertainment"];

async function pushLiveUpdates() {
  for (const topic of LIVE_TOPICS) {
    try {
      const url      = `https://newsapi.org/v2/everything?q=${topic}&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;
      const response = await axios.get(url);
      const articles = response.data.articles.filter(a => a.urlToImage && a.title && a.description);
      if (articles.length > 0) io.to(topic).emit("newUpdate", { topic, article: articles[0] });
    } catch (err) {
      console.error(`Live [${topic}]:`, err.message);
    }
  }
}

setInterval(pushLiveUpdates, 3 * 60 * 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 LivePulse running at http://localhost:${PORT}`));