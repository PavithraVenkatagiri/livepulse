const jwt = require("jsonwebtoken");

module.exports = function(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied. Please login." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({
      message: err.name === "TokenExpiredError"
        ? "Session expired. Please login again."
        : "Invalid token. Please login again."
    });
  }
};