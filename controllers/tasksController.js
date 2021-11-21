const { tasksServices, usersTasksServices } = require("../services");

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

const getUsersWithAccess = async (req, res, next) => {
  const { taskId } = req.params;

  try {
    const result = await usersTasksServices.getUsers(req.user, taskId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const giveUserAccess = async (req, res, next) => {
  const { userId, userName, userEmail, accessLevel } = req.body;
  const { taskId } = req.params;

  try {
    const result = await usersTasksServices.create(
      req.user,
      taskId,
      userId,
      userName,
      userEmail,
      accessLevel
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const editUserAccess = async (req, res, next) => {
  const { taskId, userId } = req.params;
  const { userName, userEmail, accessLevel } = req.body;

  try {
    const result = await usersTasksServices.edit(
      req.user,
      taskId,
      userId,
      userName,
      userEmail,
      accessLevel
    );
    res.status(204).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteUserAccess = async (req, res, next) => {
  const { taskId, userId } = req.params;

  try {
    const result = await usersTasksServices.remove(req.user, taskId, userId);
    res.status(204).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  editTask,
  deleteTask,
  getUsersWithAccess,
  giveUserAccess,
  editUserAccess,
  deleteUserAccess,
};
