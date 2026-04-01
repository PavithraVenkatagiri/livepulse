const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
  title: String, description: String, url: String,
  urlToImage: String, source: String, category: String,
  savedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  password:  { type: String, required: true },
  interest:  { type: String, default: "all" },
  bookmarks: [articleSchema],
  readCount: { type: Number, default: 0 },
  categoryStats: { type: Map, of: Number, default: {} }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);