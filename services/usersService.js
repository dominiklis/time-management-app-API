const ApiError = require("../errors/ApiError");
const db = require("../db");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const validateUsername = (username) => {
  if (username.length < 3) return false;

  return true;
};

const validateEmail = (email) => validator.isEmail(email);

const validatePassword = (password) =>
  validator.isStrongPassword(password, { minLength: 6 });

const register = async (name, email, password) => {
  if (!name || !email || !password)
    throw new ApiError(
      "name, email and password are required to register new user",
      400
    );

  name = name.trim();
  const isUsernameValid = validateUsername(name);
  if (!isUsernameValid) throw new ApiError(400, "invalid username");

  email = email.trim();
  const isEmailValid = validateEmail(email);
  if (!isEmailValid) throw new ApiError(400, "invalid email");

  password = password.trim();
  const isPasswordValid = validatePassword(password);
  if (!isPasswordValid)
    throw new ApiError(
      400,
      "invalid password (min. 6 characters long with 1 uppercase letter, 1 lowercase, 1 number and 1 symbol)"
    );

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { rows } = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashedPassword]
    );

    if (rows.length === 0) throw new ApiError(500, "something went wrong");

    return rows;
  } catch (error) {
    if (error.code === "23505") {
      throw new ApiError(
        400,
        "account with this username or email already exists"
      );
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
