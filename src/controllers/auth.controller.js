const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const redis = require("../config/redis");
const db = require("../config/db");
const userModel = require("../models/user.model");

const SECRET_KEY = process.env.JWT_SECRET || "default_secret_key_test1233";
const EXPIRES_IN_SEC = parseInt(process.env.JWT_EXPIRES_IN || "3600", 10); // langsung dalam detik
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
const CONCURRENT_LOGIN = process.env.CONCURRENT_LOGIN !== "false";

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findByEmail(email);
    if (!user) return res.status(401).json({ error: "Incorrect email or password." });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Incorrect email or password." });

    if (!CONCURRENT_LOGIN) {
      const pattern = `jwt:${user.id}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    }

    const jti = uuidv4();

    const token = jwt.sign({ id: user.id, email: user.email, jti }, SECRET_KEY, {
      expiresIn: EXPIRES_IN_SEC,
    });

    await redis.setEx(`jwt:${user.id}:${jti}`, EXPIRES_IN_SEC, "allow");

    return res.json({
      access_token: token,
      token_type: "bearer",
      expires_in: EXPIRES_IN_SEC,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const register = async (req, res) => {
  const { name, email, password, password_confirmation } = req.body;

  if (!name || !email || !password || !password_confirmation) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (password !== password_confirmation) {
    return res.status(422).json({ error: "Password confirmation does not match." });
  }

  try {
    const existingUsers = await userModel.findByEmail(email);
    if (existingUsers) {
      return res.status(409).json({ error: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await userModel.createUser({ name, email, password: hashedPassword });

    const jti = uuidv4();

    const token = jwt.sign({ id: result.id, email: result.email, jti }, SECRET_KEY, {
      expiresIn: EXPIRES_IN_SEC,
    });

    await redis.setEx(`jwt:${result.id}:${jti}`, EXPIRES_IN_SEC, "allow");

    return res.status(201).json({
      message: "User registered successfully",
      access_token: token,
      token_type: "bearer",
      expires_in: EXPIRES_IN_SEC,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const changePassword = async (req, res) => {
  const { password, new_password, new_password_confirmation } = req.body;

  if (!password || !new_password || !new_password_confirmation) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (new_password !== new_password_confirmation) {
    return res.status(422).json({ error: "New password confirmation does not match." });
  }

  try {
    const user = await userModel.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Old password is incorrect." });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    const success = await userModel.changePassword(user.id, hashedNewPassword);
    if (!success) {
      return res.status(500).json({ error: "Failed to change password." });
    }
    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const profile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const logout = async (req, res) => {
  try {
    if (req.tokenKey) {
      await redis.del(req.tokenKey);
    }

    return res.json({ message: "Logout successful." });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  login,
  register,
  changePassword,
  logout,
  profile,
};
