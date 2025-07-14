const crypto = require("crypto");
const { isValidTimestamp } = require("../utils/validTimestamp");

const response = require("../helpers/response");

const SIGNATURE_KEY = process.env.SIGNATURE_KEY || "default_secret";

const verifySignature = (req, res, next) => {
  const signature = req.headers["x-signature"];
  const timestamp = req.headers["x-timestamp"];

  if (!signature || !timestamp || !isValidTimestamp(Number(timestamp))) {
    return response.error(res, "invalid_signature", "Signature does not match.", 401);
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
    return response.error(res, "invalid_signature", "Signature does not match.", 401);
  }

  next();
};

module.exports = verifySignature;
