require("dotenv").config();

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const mongoose   = require("mongoose");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const axios      = require("axios");
const cors       = require("cors");
const path       = require("path");

// ──────────────────────────────────────────────
//  App Setup
// ──────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Serve frontend files from the "frontend" folder
app.use(express.static(path.join(__dirname, "frontend")));

// ──────────────────────────────────────────────
//  MongoDB Connection
// ──────────────────────────────────────────────

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ──────────────────────────────────────────────
//  User Schema & Model
// ──────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  interest: { type: String, default: "all" },
});

const User = mongoose.model("User", userSchema);

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function validatePassword(password) {
  // Min 12 chars, uppercase, lowercase, number, special char
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  return regex.test(password);
}

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token. Please login." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ message: "Invalid or expired token." });
  }
}

// ──────────────────────────────────────────────
//  Auth Routes
// ──────────────────────────────────────────────

// POST /register
app.post("/register", async (req, res) => {
  try {
    const { username, password, interest } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 12 characters and include uppercase, lowercase, number, and special character (@$!%*?&).",
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser        = new User({ username, password: hashedPassword, interest: interest || "all" });
    await newUser.save();

    res.status(201).json({ message: "Account created successfully! Please login." });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// POST /login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, interest: user.interest },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, interest: user.interest, message: "Login successful!" });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login." });
  }
});

// ──────────────────────────────────────────────
//  News Route (protected)
// ──────────────────────────────────────────────

// GET /updates/:topic
app.get("/updates/:topic", verifyToken, async (req, res) => {
  try {
    const topic = req.params.topic;
    let url;

    if (topic === "all") {
      url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWS_API_KEY}`;
    } else {
      url = `https://newsapi.org/v2/everything?q=${topic}&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`;
    }

    const response = await axios.get(url);

    // Filter out articles with missing images or descriptions
    const articles = response.data.articles.filter(
      (a) => a.urlToImage && a.title && a.description
    );

    res.json({ articles });
  } catch (err) {
    console.error("News fetch error:", err.message);
    res.status(500).json({ message: "Error fetching news updates." });
  }
});

// ──────────────────────────────────────────────
//  Socket.io — Real-time Live Feed
// ──────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Client sends { topic } to subscribe to a category
  socket.on("subscribe", (topic) => {
    socket.join(topic);
    console.log(`📡 ${socket.id} subscribed to: ${topic}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Push live updates to a topic room every 2 minutes
const TOPICS = ["technology", "sports", "education", "music"];

async function pushLiveUpdates() {
  for (const topic of TOPICS) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${topic}&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`;
      const response = await axios.get(url);
      const articles = response.data.articles.filter(
        (a) => a.urlToImage && a.title && a.description
      );
      if (articles.length > 0) {
        io.to(topic).emit("newUpdate", { topic, article: articles[0] });
      }
    } catch (err) {
      console.error(`Live update error for ${topic}:`, err.message);
    }
  }
}

setInterval(pushLiveUpdates, 2 * 60 * 1000); // every 2 minutes

// ──────────────────────────────────────────────
//  Start Server
// ──────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 LivePulse server running at http://localhost:${PORT}`);
});
