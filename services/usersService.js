const db = require("../db");
const bcrypt = require("bcryptjs");

const register = async (name, email, password) => {
  if (!name || !email || !password)
    throw new Error(
      "name, email and password are required to register new user"
    );

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { rows } = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashedPassword]
    );
    return rows;
  } catch (error) {
    console.log("ERROR Z DB");
    console.log(error);

    if (error.code === "23505") {
      console.log("account with this user name or email already exists");
    }
    throw error;
  }
};

const login = () => {};

const update = () => {};

const renew = () => {};

module.exports = {
  register,
  login,
  update,
  renew,
};
