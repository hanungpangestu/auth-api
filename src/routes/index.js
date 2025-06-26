const express = require("express");
const router = express.Router();
const authRoutes = require("./auth.routes");

router.get("/", (req, res) => {
  res.send("API aktif!");
});

router.use("/auth", authRoutes);

module.exports = router;
