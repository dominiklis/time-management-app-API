const ApiError = require("../errors/ApiError");
const db = require("../db");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const validateUsername = (username) => {
  if (!username) return false;
  if (username.length < 3) return false;

  return true;
};

const validateEmail = (email) => {
  if (!email) return false;
  return validator.isEmail(email);
};

const validatePassword = (password) =>
  validator.isStrongPassword(password, { minLength: 6 });

const createToken = (id, name, email) =>
  jwt.sign({ id, name, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME,
  });

const register = async (name, email, password) => {
  if (!name || !email || !password)
    throw new ApiError(
      400,
      "name, email and password are required to register new user"
    );

  name = name.trim();
  const isUsernameValid = validateUsername(name);
  if (!isUsernameValid) throw new ApiError(400, "invalid username");

  email = email.trim();
  const isEmailValid = validateEmail(email);
  if (!isEmailValid) throw new ApiError(400, "invalid email");

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

    return {
      user: {
        id: rows[0].user_id,
        name: rows[0].name,
        email: rows[0].email,
      },
      token: createToken(rows[0].user_id, name, email),
    };
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

const login = async (name, email, password) => {
  if ((!name && !email) || !password)
    throw new ApiError(
      400,
      "password and email or username are required to register new user"
    );

  const isUsernameValid = validateUsername(name);
  const isEmailValid = validateEmail(email);
  if (!isUsernameValid && !isEmailValid)
    throw new ApiError(400, "invalid username or email");

  const isPasswordValid = validatePassword(password);
  if (!isPasswordValid)
    throw new ApiError(
      400,
      "invalid password (min. 6 characters long with 1 uppercase letter, 1 lowercase, 1 number and 1 symbol)"
    );

  try {
    let query = "";
    const params = [];
    if (isEmailValid) {
      query = "SELECT * FROM users WHERE email=$1";
      params.push(email);
    } else {
      query = "SELECT * FROM users WHERE name=$1";
      params.push(name);
    }

    const { rows } = await db.query(query, params);

    if (rows.length === 0)
      throw new ApiError(400, "invalid username, email or password");

    const isPasswordValid = await bcrypt.compare(password, rows[0].password);
    if (!isPasswordValid)
      throw new ApiError(400, "invalid username, email or password");

    return {
      user: {
        id: rows[0].user_id,
        name: rows[0].name,
        email: rows[0].email,
      },
      token: createToken(rows[0].user_id, name, email),
    };
  } catch (error) {
    throw error;
  }
};

const update = () => {};

const renew = () => {};

module.exports = {
  register,
  login,
  update,
  renew,
};
