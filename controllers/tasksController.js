const db = require("../db");
const { tasksServices } = require("../services");

const createTask = async (req, res, next) => {
  const { name, description, dateToComplete, startTime, endTime } = req.body;

  try {
    const result = await tasksServices.create(
      req.user,
      name,
      description,
      dateToComplete,
      startTime,
      endTime
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
};
