const { usersServices } = require("../services");

const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    const result = await usersServices.register(name, email, password);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    const result = await usersServices.login(name, email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  const { newName, newEmail, newPassword, currentPassword } = req.body;

  try {
    const result = await usersServices.update(
      req.user,
      newName,
      newEmail,
      newPassword,
      currentPassword
    );
    res.status(204).json(result);
  } catch (error) {
    next(error);
  }
};

const renew = async (req, res, next) => {
  try {
    const result = await usersServices.renew(req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  update,
  renew,
};
