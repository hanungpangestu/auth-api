const jwt = require("jsonwebtoken");
const redis = require("../config/redis");

const response = require("../helpers/response");

const SECRET = process.env.JWT_SECRET || "default_secret_key_test1233";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return response.error(res, "missing_auth", "Authorization header is missing or invalid.", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    const jti = decoded.jti;
    const userId = decoded.id;

    const redisSetKey = `jwt:${userId}`;
    const isValid = await redis.sendCommand(["SISMEMBER", String(redisSetKey), String(jti)]);

    if (!isValid) {
      // return res.status(401).json({ error: "Invalid token" });
      return response.error(res, "invalid_token", "Token is no longer valid or has been revoked.", 401);
    }

    req.user = decoded;
    req.tokenKey = redisSetKey;
    next();
  } catch (err) {
    // return res.status(401).json({ error: "Invalid token" });
    return response.error(res, "invalid_token", "Token is invalid or expired.", 401);
  }
};

module.exports = verifyToken;
