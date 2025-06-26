const db = require("../config/db");

const findByEmail = async (email) => {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] || null;
};

const createUser = async ({ name, email, password }) => {
  const [result] = await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, password]);

  return {
    id: result.insertId,
    name,
    email,
  };
};

const changePassword = async (userId, newPassword) => {
  const [result] = await db.query("UPDATE users SET password = ? WHERE id = ?", [newPassword, userId]);

  return result.affectedRows > 0;
};

module.exports = {
  findByEmail,
  createUser,
  changePassword,
};
