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
app.use(verifySignature);

app.use("/", routes);
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

module.exports = app;
