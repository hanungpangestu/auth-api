const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyToken = require("../middlewares/auth.middleware");

router.post("/login", authController.login);
router.post("/register", authController.register);

router.post("/change-password", verifyToken, authController.changePassword);
router.get("/profile", verifyToken, authController.profile);
router.delete("/logout", verifyToken, authController.logout);

module.exports = router;
