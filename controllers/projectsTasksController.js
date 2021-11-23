const { projectsTasksServices } = require("../services");

const getAssignedTasks = async (req, res, next) => {
  const { projectId } = req.params;

  try {
    const result = await projectsTasksServices.getTasks(req.user, projectId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const assignTask = async (req, res, next) => {
  const { projectId } = req.params;
  const { taskId } = req.body;

  try {
    const result = await projectsTasksServices.create(
      req.user,
      projectId,
      taskId
    );

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const removeAssignedTasks = async (req, res, next) => {
  const { projectId, taskId } = req.params;

  try {
    const result = await projectsTasksServices.remove(
      req.user,
      projectId,
      taskId
    );

    return res.status(204).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedTasks,
  assignTask,
  removeAssignedTasks,
};
