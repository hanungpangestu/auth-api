const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyToken = require("../middlewares/auth.middleware");

router.post("/login", authController.login);
router.post("/register", authController.register);

router.use(verifyToken);
router.post("/change-password", authController.changePassword);
router.get("/profile", authController.profile);
router.get("/logout", authController.logout);

module.exports = router;
