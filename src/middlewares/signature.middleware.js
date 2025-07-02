const crypto = require("crypto");

const SIGNATURE_KEY = process.env.SIGNATURE_KEY || "default_secret";
const SIGNATURE_TIMELIMIT = parseInt(process.env.SIGNATURE_TIMELIMIT || "60000"); // dalam ms

const verifySignature = (req, res, next) => {
  const signature = req.headers["x-signature"];
  const timestamp = req.headers["x-timestamp"];

  if (!signature || !timestamp) {
    return res.status(401).json({ error: "Missing signature or timestamp" });
  }

  const now = Date.now();
  const diff = Math.abs(now - Number(timestamp));
  if (diff > SIGNATURE_TIMELIMIT) {
    return res.status(401).json({ error: "Signature timestamp expired" });
  }

  const methodsWithBody = ["POST", "PUT", "PATCH", "DELETE"];
  let bodyString = "";
  let bodyHash = "";

  if (methodsWithBody.includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    bodyString = JSON.stringify(req.body);

    bodyHash = crypto.createHash("sha256").update(bodyString).digest("hex");
  }

  const uri = req.originalUrl.split("?")[0]; // strip query string
  const dataToSign = req.method + uri + bodyHash + timestamp;

  const expectedSignature = crypto.createHmac("sha256", SIGNATURE_KEY).update(dataToSign).digest("hex");

  if (expectedSignature !== signature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
};

module.exports = verifySignature;
