const jwt = require("jsonwebtoken");
const redis = require("../config/redis");

const SECRET = process.env.JWT_SECRET || "default_secret_key_test1233";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    const jti = decoded.jti;
    const userId = decoded.id;

    const key = `jwt:${userId}:${jti}`;
    const exists = await redis.get(key);
    if (!exists) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = decoded;
    req.tokenKey = key;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = verifyToken;
