const ApiError = require("../errors/ApiError");
const db = require("../db");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const { mapToCamelCase } = require("../utils");

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

    const newUser = await db.oneOrNone(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, hashedPassword]
    );

    if (!newUser) throw new ApiError(500, "something went wrong");

    return {
      user: {
        id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
      },
      token: createToken(newUser.user_id, name, email),
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
    throw new ApiError(
      400,
      `invalid username, email or password (min. 6 characters long with 1 uppercase letter, 1 lowercase, 1 number and 1 symbol)`
    );

  const isPasswordValid = validatePassword(password);
  if (!isPasswordValid)
    throw new ApiError(
      400,
      `invalid username, email or password (min. 6 characters long with 1 uppercase letter, 1 lowercase, 1 number and 1 symbol)`
    );

  try {
    const user = await db.oneOrNone(
      `SELECT * FROM users WHERE name=$1 OR email=$2`,
      [name, email]
    );

    if (!user)
      throw new ApiError(
        400,
        `invalid username, email or password (min. 6 characters long with 1 uppercase letter, 1 lowercase, 1 number and 1 symbol)`
      );

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new ApiError(
        400,
        `invalid username, email or password (min. 6 characters long with 1 uppercase letter, 1 lowercase, 1 number and 1 symbol)`
      );

    return {
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
      },
      token: createToken(user.user_id, user.name, user.email),
    };
  } catch (error) {
    throw error;
  }
};

const update = async (
  user,
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
    const result = await db.task(async (t) => {
      const userToUpdate = await t.one(`SELECT * FROM users WHERE user_id=$1`, [
        user.id,
      ]);

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        userToUpdate.password
      );

      if (
        !isPasswordValid ||
        user.name !== userToUpdate.name ||
        user.email !== userToUpdate.email
      )
        throw new ApiError(400, "bad request");

      let query = "name=$2, email=$3, password=$4";
      let params = [user.id];

      if (newName) {
        params.push(newName);
        query = query + ", name_updated=CURRENT_TIMESTAMP";
      } else {
        params.push(userToUpdate.name);
      }

      if (newEmail) {
        params.push(newEmail);
        query = query + ", email_updated=CURRENT_TIMESTAMP";
      } else {
        params.push(userToUpdate.email);
      }

      if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);
        params.push(hashedNewPassword);
        query = query + ", password_updated=CURRENT_TIMESTAMP";
      } else {
        params.push(userToUpdate.password);
      }

      query = `UPDATE users SET ${query} WHERE user_id=$1 RETURNING *`;

      const updatedUser = await t.oneOrNone(query, params);

      if (!updatedUser) throw new ApiError(500, "something went wrong");

      return updatedUser;
    });

    return {
      user: mapToCamelCase.user(result),
      token: createToken(result.user_id, result.name, result.email),
    };
  } catch (error) {
    if (error?.code === "23505")
      throw new ApiError(
        400,
        "user with this email or username already exists"
      );

    throw error;
  }
};

const renew = async (user) => {
  try {
    const userFromDb = await db.oneOrNone(
      "SELECT * FROM users WHERE user_id=$1",
      [user.id]
    );

    if (!userFromDb) throw new ApiError(400, "bad request");

    if (user.name !== userFromDb.name || user.email !== userFromDb.email)
      throw new ApiError(400, "bad request");

    return {
      user: {
        id: userFromDb.user_id,
        name: userFromDb.name,
        email: userFromDb.email,
      },
      token: createToken(userFromDb.user_id, userFromDb.name, userFromDb.email),
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
