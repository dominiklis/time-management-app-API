const { tasksServices } = require("../services");

const getTasks = async (req, res, next) => {
  try {
    const result = await tasksServices.get(req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await tasksServices.getById(req.user, id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

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

const editTask = async (req, res, next) => {
  const { name, description, dateToComplete, startTime, endTime } = req.body;
  const { id } = req.params;

  try {
    const result = await tasksServices.edit(
      req.user,
      id,
      name,
      description,
      dateToComplete,
      startTime,
      endTime
    );

    res.status(204).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await tasksServices.remove(req.user, id);

    res.status(204).json(result);
  } catch (error) {
    next(error);
  }
};

// users_tasks realtionship

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  editTask,
  deleteTask,
};
