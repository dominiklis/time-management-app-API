const { usersProjectsServices } = require("../services");

const getUsersWithAccess = async (req, res, next) => {
  const { projectId } = req.params;

  try {
    const result = await usersProjectsServices.getUsers(req.user, projectId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const giveUserAccess = async (req, res, next) => {
  const {
    userId,
    userName,
    userEmail,
    canShare,
    canChangePermissions,
    canEdit,
    canDelete,
  } = req.body;
  const { projectId } = req.params;

  try {
    const result = await usersProjectsServices.create(
      req.user,
      projectId,
      userId,
      userName,
      userEmail,

      canShare,
      canChangePermissions,
      canEdit,
      canDelete
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const editUsersAccess = async (req, res, next) => {
  const { projectId, userId } = req.params;
  const { canShare, canChangePermissions, canEdit, canDelete } = req.body;

  try {
    const result = await usersProjectsServices.edit(
      req.user,
      projectId,
      userId,

      canShare,
      canChangePermissions,
      canEdit,
      canDelete
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeUsersAccess = async (req, res, next) => {
  const { projectId, userId } = req.params;

  try {
    const result = await usersProjectsServices.remove(
      req.user,
      projectId,
      userId
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsersWithAccess,
  giveUserAccess,
  editUsersAccess,
  removeUsersAccess,
};
