const { usersTasksServices } = require("../services");

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
  getUsersWithAccess,
  giveUserAccess,
  editUserAccess,
  deleteUserAccess,
};
