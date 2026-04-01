const express     = require("express");
const bcrypt      = require("bcryptjs");
const jwt         = require("jsonwebtoken");
const User        = require("../models/User");
const verifyToken = require("../middleware/auth");

const router = express.Router();

const validatePassword = p =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/.test(p);

// POST /register
router.post("/register", async (req, res) => {
  try {
    const { username, password, interest } = req.body;
    if (!username || !password) return res.status(400).json({ message: "All fields are required." });
    if (username.trim().length < 3) return res.status(400).json({ message: "Username must be at least 3 characters." });
    if (!validatePassword(password)) return res.status(400).json({ message: "Password must be 12+ chars with uppercase, lowercase, number and special character (@$!%*?&)." });
    if (await User.findOne({ username: username.trim() })) return res.status(409).json({ message: "Username already taken." });

    await new User({ username: username.trim(), password: await bcrypt.hash(password, 12), interest: interest || "all" }).save();
    res.status(201).json({ message: "Account created! Please login." });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Username already taken." });
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// POST /login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "All fields are required." });
    const user = await User.findOne({ username: username.trim() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid username or password." });
    const token = jwt.sign(
      { id: user._id, username: user.username, interest: user.interest },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, interest: user.interest, username: user.username, message: "Login successful!" });
  } catch (err) {
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// GET /profile
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch { res.status(500).json({ message: "Server error." }); }
});

// PUT /profile
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { interest, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (interest) user.interest = interest;
    if (newPassword) {
      if (!validatePassword(newPassword)) return res.status(400).json({ message: "Password must be 12+ chars with uppercase, lowercase, number and special character." });
      user.password = await bcrypt.hash(newPassword, 12);
    }
    await user.save();
    res.json({ message: "Profile updated!" });
  } catch { res.status(500).json({ message: "Server error." }); }
});

// POST /track-read
router.post("/track-read", verifyToken, async (req, res) => {
  try {
    const { category } = req.body;
    const user = await User.findById(req.user.id);
    user.readCount = (user.readCount || 0) + 1;
    if (category) {
      const count = user.categoryStats.get(category) || 0;
      user.categoryStats.set(category, count + 1);
    }
    await user.save();
    res.json({ message: "Tracked." });
  } catch { res.status(500).json({ message: "Server error." }); }
});

module.exports = router;