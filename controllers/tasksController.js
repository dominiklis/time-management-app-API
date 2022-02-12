const { tasksServices } = require("../services");

const getTasks = async (req, res, next) => {
  const { start, end, withoutDate } = req.query;

  try {
    const result = await tasksServices.get(req.user, {
      start,
      end,
      withoutDate,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  const { taskId } = req.params;

  try {
    const result = await tasksServices.getById(req.user, taskId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const searchTasks = async (req, res, next) => {
  const { searchInput } = req.body;

  try {
    const result = await tasksServices.getByNameOrDescription(
      req.user,
      searchInput
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  const {
    taskName,
    taskDescription,
    taskCompleted,
    startDate,
    endDate,
    startTime,
    endTime,
    projectId,
    priority,
  } = req.body;

  try {
    const result = await tasksServices.create(
      req.user,
      taskName,
      taskDescription,
      taskCompleted,
      startDate,
      endDate,
      startTime,
      endTime,
      projectId,
      priority
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const editTask = async (req, res, next) => {
  const {
    taskName,
    taskDescription,
    taskCompleted,
    startDate,
    endDate,
    startTime,
    endTime,
    projectId,
    priority,
  } = req.body;
  const { taskId } = req.params;

  try {
    const result = await tasksServices.edit(
      req.user,
      taskId,
      taskName,
      taskDescription,
      taskCompleted,
      startDate,
      endDate,
      startTime,
      endTime,
      projectId,
      priority
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  const { taskId } = req.params;

  try {
    const result = await tasksServices.remove(req.user, taskId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  searchTasks,
  createTask,
  editTask,
  deleteTask,
};
