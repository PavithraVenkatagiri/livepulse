const express     = require("express");
const axios       = require("axios");
const verifyToken = require("../middleware/auth");
const User        = require("../models/User");

const router = express.Router();

// All supported topics with their NewsAPI queries
const TOPIC_QUERIES = {
  all:           { type: "headlines", query: "country=us" },
  technology:    { type: "everything", query: "technology" },
  sports:        { type: "everything", query: "sports" },
  education:     { type: "everything", query: "education" },
  music:         { type: "everything", query: "music" },
  politics:      { type: "everything", query: "politics government" },
  business:      { type: "everything", query: "business finance economy" },
  health:        { type: "everything", query: "health medicine science" },
  world:         { type: "everything", query: "world international news" },
  entertainment: { type: "everything", query: "movies entertainment celebrity" },
  space:         { type: "everything", query: "space nasa astronomy innovation" },
  environment:   { type: "everything", query: "climate environment nature" },
  law:           { type: "everything", query: "law justice court crime" },
  gaming:        { type: "everything", query: "gaming esports video games" },
  // Job sectors
  "jobs-it":        { type: "everything", query: "software developer jobs IT hiring tech" },
  "jobs-health":    { type: "everything", query: "healthcare jobs nursing medical hiring" },
  "jobs-education": { type: "everything", query: "teaching jobs education faculty hiring" },
  "jobs-finance":   { type: "everything", query: "finance banking jobs hiring analyst" },
  "jobs-engineering":{ type: "everything", query: "engineering jobs mechanical civil hiring" },
  "jobs-design":    { type: "everything", query: "design jobs UI UX creative hiring" },
  "jobs-data":      { type: "everything", query: "data science AI machine learning jobs" },
  "jobs-marketing": { type: "everything", query: "marketing sales digital jobs hiring" },
  "jobs-legal":     { type: "everything", query: "legal lawyer attorney jobs hiring" },
  "jobs-construction":{ type: "everything", query: "construction architecture real estate jobs" },
};

// GET /updates/:topic
router.get("/updates/:topic", verifyToken, async (req, res) => {
  try {
    const { topic } = req.params;
    const page     = parseInt(req.query.page) || 1;
    const pageSize = 12;

    if (!TOPIC_QUERIES[topic]) return res.status(400).json({ message: "Invalid topic." });

    const cfg = TOPIC_QUERIES[topic];
    let url;

    if (cfg.type === "headlines") {
      url = `https://newsapi.org/v2/top-headlines?${cfg.query}&pageSize=40&apiKey=${process.env.NEWS_API_KEY}`;
    } else {
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(cfg.query)}&sortBy=publishedAt&pageSize=40&language=en&apiKey=${process.env.NEWS_API_KEY}`;
    }

    const response    = await axios.get(url);
    const allArticles = response.data.articles.filter(a => a.urlToImage && a.title && a.description && a.url);
    const start       = (page - 1) * pageSize;
    const articles    = allArticles.slice(start, start + pageSize);

    res.json({
      articles,
      hasMore: allArticles.length > start + pageSize,
      total: allArticles.length,
      page
    });
  } catch (err) {
    console.error("News error:", err.message);
    res.status(500).json({ message: "Error fetching news. Please try again." });
  }
});

// GET /trending
router.get("/trending", verifyToken, async (req, res) => {
  try {
    const url      = `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    const articles = response.data.articles.filter(a => a.title && a.url).slice(0, 5);
    res.json({ articles });
  } catch (err) {
    res.status(500).json({ message: "Error fetching trending." });
  }
});

// POST /bookmarks
router.post("/bookmarks", verifyToken, async (req, res) => {
  try {
    const { title, description, url, urlToImage, source, category } = req.body;
    if (!title || !url) return res.status(400).json({ message: "Title and URL required." });
    const user = await User.findById(req.user.id);
    if (user.bookmarks.some(b => b.url === url)) return res.status(409).json({ message: "Already bookmarked." });
    user.bookmarks.push({ title, description, url, urlToImage, source, category });
    await user.save();
    res.json({ message: "Bookmarked!" });
  } catch { res.status(500).json({ message: "Server error." }); }
});

// GET /bookmarks
router.get("/bookmarks", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("bookmarks");
    res.json({ bookmarks: user.bookmarks.reverse() });
  } catch { res.status(500).json({ message: "Server error." }); }
});

// DELETE /bookmarks
router.delete("/bookmarks", verifyToken, async (req, res) => {
  try {
    const { url } = req.body;
    const user = await User.findById(req.user.id);
    user.bookmarks = user.bookmarks.filter(b => b.url !== url);
    await user.save();
    res.json({ message: "Bookmark removed." });
  } catch { res.status(500).json({ message: "Server error." }); }
});

module.exports = router;