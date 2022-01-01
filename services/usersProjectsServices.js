const { db } = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase } = require("../utils");

const getUsers = async (user, projectId) => {
  try {
    const result = await db.usersProjects.listForProject(projectId);

    if (!result.some((up) => up.user_id === user.id))
      throw new ApiError(400, errorTexts.common.badRequest);

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const create = async (
  user,
  projectId,
  userId,
  userName,
  userEmail,
  canShare = false,
  canChangePermissions = false,
  canEdit = false,
  canDelete = false
) => {
  try {
    const result = await db.task(async (t) => {
      const usersProjects = await t.usersProjects.getSingle(user.id, projectId);

      if (!usersProjects || !usersProjects.can_share)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (!usersProjects.can_change_permissions)
        canShare = canChangePermissions = canEdit = canDelete = false;

      const foundUser = await t.users.getSingle(userName, userEmail, userId);
      if (!foundUser) throw new ApiError(400, errorTexts.common.userNotFound);

      const createdUP = await t.usersProjects.add(
        foundUser.user_id,
        projectId,
        canShare,
        canChangePermissions,
        canEdit,
        canDelete
      );

      if (!createdUP)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return { ...createdUP, userName: foundUser.name };
    });

    return mapToCamelCase(result);
  } catch (error) {
    if (error?.code === "23505") {
      throw new ApiError(400, errorTexts.access.userHasAccess);
    }

    throw error;
  }
};

const edit = async (
  user,
  projectId,
  userId,
  canShare,
  canChangePermissions,
  canEdit,
  canDelete
) => {
  try {
    const result = await db.task(async (t) => {
      const usersProjects = await t.usersProjects.getSingle(user.id, projectId);
      if (!usersProjects || !usersProjects.can_change_permissions)
        throw new ApiError(400, errorTexts.common.badRequest);

      const authorId = await t.oneOrNone(
        "SELECT author_id FROM projects WHERE project_id=$1",
        [projectId]
      );
      if (userId === authorId.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      const editedUP = await t.usersProjects.edit(
        userId,
        projectId,
        canShare,
        canChangePermissions,
        canEdit,
        canDelete
      );

      if (!editedUP)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return editedUP;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const remove = async (user, projectId, userId) => {
  try {
    const result = await db.task(async (t) => {
      const usersProjects = await t.usersProjects.getSingle(user.id, projectId);

      if (
        !usersProjects ||
        !usersProjects.can_change_permissions ||
        user.id === userId
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      const authorId = await t.oneOrNone(
        "SELECT author_id FROM projects WHERE project_id=$1",
        [projectId]
      );
      if (userId === authorId.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedUP = await t.usersProjects.delete(projectId, userId);

      if (!removedUP)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return removedUP;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getUsers,
  create,
  edit,
  remove,
};
