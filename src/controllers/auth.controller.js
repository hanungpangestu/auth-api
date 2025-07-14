const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const redis = require("../config/redis");
const userModel = require("../models/user.model");

const response = require("../helpers/response");

const SECRET_KEY = process.env.JWT_SECRET || "default_secret_key_test1233";
const EXPIRES_IN_SEC = parseInt(process.env.JWT_EXPIRES_IN || "3600", 10); // langsung dalam detik
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
const CONCURRENT_LOGIN = process.env.CONCURRENT_LOGIN !== "false";

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return response.error(res, "validation_error", "All fields are required.", 400);
  }

  try {
    const user = await userModel.findByEmail(email);
    if (!user) return response.error(res, "invalid_credentials", "Incorrect email or password.", 401);

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return response.error(res, "invalid_credentials", "Incorrect email or password.", 401);

    const jti = uuidv4();
    const redisSetKey = `jwt:${user.id}`;

    if (!CONCURRENT_LOGIN) {
      await redis.sendCommand(["DEL", redisSetKey]);
    }

    const token = jwt.sign({ id: user.id, email: user.email, jti }, SECRET_KEY, {
      expiresIn: EXPIRES_IN_SEC,
    });

    await redis.multi().sAdd(redisSetKey, jti).expire(redisSetKey, EXPIRES_IN_SEC).exec();

    return response.success(res, "Login successful.", {
      access_token: token,
      token_type: "bearer",
      expires_in: EXPIRES_IN_SEC,
    });
  } catch (error) {
    console.error("Login error:", error);
    return response.error(res, "internal_server_error", "Something went wrong on our side. Please try again later.", 500);
  }
};

const register = async (req, res) => {
  const { name, email, password, password_confirmation } = req.body;

  if (!name || !email || !password || !password_confirmation) {
    return response.error(res, "validation_error", "All fields are required.", 400);
  }

  if (password !== password_confirmation) {
    return response.error(res, "validation_error", "Password confirmation does not match.", 422);
  }

  try {
    const existingUsers = await userModel.findByEmail(email);
    if (existingUsers) {
      return response.error(res, "email_already_exists", "Email is already registered.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await userModel.createUser({ name, email, password: hashedPassword });

    const jti = uuidv4();
    const redisSetKey = `jwt:${result.id}`;

    const token = jwt.sign({ id: result.id, email: result.email, jti }, SECRET_KEY, {
      expiresIn: EXPIRES_IN_SEC,
    });

    await redis.sendCommand(["SADD", String(redisSetKey), String(jti)]);
    await redis.sendCommand(["EXPIRE", String(redisSetKey), String(EXPIRES_IN_SEC)]);

    return response.success(
      res,
      "User registered successfully.",
      {
        access_token: token,
        token_type: "bearer",
        expires_in: EXPIRES_IN_SEC,
      },
      201
    );
  } catch (error) {
    console.error("Register error:", error);
    return response.error(res, "internal_server_error", "Something went wrong on our side. Please try again later.", 500);
  }
};

const changePassword = async (req, res) => {
  const { password, new_password, new_password_confirmation } = req.body;

  if (!password || !new_password || !new_password_confirmation) {
    return response.error(res, "validation_error", "All fields are required.", 400);
  }

  if (new_password !== new_password_confirmation) {
    return response.error(res, "validation_error", "New password confirmation does not match.", 422);
  }

  try {
    const user = await userModel.findByEmail(req.user.email);
    if (!user) {
      return response.error(res, "user_not_found", "User not found.", 404);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return response.error(res, "invalid_credentials", "Current password is incorrect.", 401);
    }

    if (new_password === password) {
      return response.error(res, "validation_error", "New password cannot be the same as the current password.", 422);
    }

    const hashedNewPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    const success = await userModel.changePassword(user.id, hashedNewPassword);
    if (!success) {
      return response.error(res, "internal_server_error", "Failed to change password. Please try again later.", 500);
    }
    return response.success(res, "Password changed successfully.");
  } catch (error) {
    console.error("Change password error:", error);
    return response.error(res, "internal_server_error", "Something went wrong on our side. Please try again later.", 500);
  }
};

const profile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);

    return response.success(res, "User profile retrieved successfully.", {
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return response.error(res, "internal_server_error", "Something went wrong on our side. Please try again later.", 500);
  }
};

const logout = async (req, res) => {
  try {
    if (req.tokenKey) {
      await redis.del(req.tokenKey);
    }

    return response.success(res, "Logout successful.");
  } catch (err) {
    console.error("Logout error:", err);
    return response.error(res, "internal_server_error", "Something went wrong on our side. Please try again later.", 500);
  }
};

module.exports = {
  login,
  register,
  changePassword,
  logout,
  profile,
};
