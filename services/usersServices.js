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
    throw new ApiError(400, "password and email or username are required");

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
      token: createToken(rows[0].user_id, rows[0].name, rows[0].email),
    };
  } catch (error) {
    throw error;
  }
};

const update = async (
  loggedUser,
  newName,
  newEmail,
  newPassword,
  currentPassword
) => {
  if (!newName && !newEmail && !newPassword) return;

  if (newName) {
    newName = newName.trim();
    const isNewNameValid = validateUsername(newName);
    if (!isNewNameValid) throw new ApiError(400, "new username is invalid");
  }

  if (newEmail) {
    newEmail = newEmail.trim();
    const isNewEmailValid = validateEmail(newEmail);
    if (!isNewEmailValid) throw new ApiError(400, "new email is invalid");
  }

  if (newPassword) {
    newPassword = newPassword.trim();
    const isNewPasswordValid = validatePassword(newPassword);
    if (!isNewPasswordValid) throw new ApiError(400, "new password is invalid");
  }

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE user_id=$1;", [
      loggedUser.id,
    ]);

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      rows[0].password
    );

    if (
      !isPasswordValid ||
      loggedUser.name !== rows[0].name ||
      loggedUser.email !== rows[0].email
    )
      throw new ApiError(400, "bad request");

    let query = "name=$2, email=$3, password=$4";
    let params = [loggedUser.id];

    if (newName) {
      params.push(newName);
      query = query + ", name_updated=CURRENT_TIMESTAMP";
    } else {
      params.push(rows[0].name);
    }

    if (newEmail) {
      params.push(newEmail);
      query = query + ", email_updated=CURRENT_TIMESTAMP";
    } else {
      params.push(rows[0].email);
    }

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(newPassword, salt);
      params.push(hashedNewPassword);
      query = query + ", password_updated=CURRENT_TIMESTAMP";
    } else {
      params.push(rows[0].password);
    }

    const { rows: updated } = await db.query(
      `UPDATE users SET ${query} WHERE user_id=$1 RETURNING *;`,
      params
    );

    if (updated.length === 0) throw new ApiError(500, "something went wrong");

    return updated;
  } catch (error) {
    throw error;
  }
};

const renew = async (user) => {
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE user_id=$1", [
      user.id,
    ]);
    console.log(rows);

    if (user.name !== rows[0].name || user.email !== rows[0].email)
      throw new ApiError(400, "bad request");

    return {
      user: {
        id: rows[0].user_id,
        name: rows[0].name,
        email: rows[0].email,
      },
      token: createToken(rows[0].user_id, rows[0].name, rows[0].email),
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  register,
  login,
  update,
  renew,
};
