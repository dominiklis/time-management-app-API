const db = require("../db");
const { userService } = require("../services");

const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    const result = await userService.register(name, email, password);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    const result = await userService.login(name, email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    res.status(204).json("UPDATE USER");
  } catch (error) {
    next(error);
  }
};

const renew = async (req, res, next) => {
  try {
    res.status(200).json("RENEW USER");
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
