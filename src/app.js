require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const routes = require("./routes");
const verifySignature = require("./middlewares/signature.middleware");

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const skipPaths = ["/", "/favicon.ico", "/public"];
  const shouldSkip = skipPaths.some((path) => req.path === path || req.path.startsWith(path + "/"));

  if (shouldSkip) return next();

  return verifySignature(req, res, next);
});

app.use("/api", routes);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "not_found",
    message: "The requested resource was not found.",
  });
});

module.exports = app;
