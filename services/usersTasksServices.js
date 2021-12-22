const { db } = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase } = require("../utils");

const getUsers = async (user, taskId) => {
  try {
    const result = await db.usersTasks.listForTask(taskId);

    if (!result.some((ut) => ut.user_id === user.id))
      throw new ApiError(400, errorTexts.common.badRequest);

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const create = async (
  user,
  taskId,
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
      const usersTasks = await t.usersTasks.getSingle(user.id, taskId);

      if (!usersTasks || !usersTasks.can_share)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (!usersTasks.can_change_permissions)
        canShare = canChangePermissions = canEdit = canDelete = false;

      foundUser = await t.users.getSingle(userName, userEmail, userId);
      if (!foundUser) throw new ApiError(400, errorTexts.common.userNotFound);

      const createdUT = await t.usersTasks.add(
        foundUser.user_id,
        taskId,
        canShare,
        canChangePermissions,
        canEdit,
        canDelete
      );
      if (!createdUT)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return { ...createdUT, userName: foundUser.name };
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
  taskId,
  userId,
  canShare,
  canChangePermissions,
  canEdit,
  canDelete
) => {
  try {
    const result = await db.task(async (t) => {
      const usersTasks = await t.usersTasks.getSingle(user.id, taskId);

      if (!usersTasks || !usersTasks.can_change_permissions)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (userId === usersTasks.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      const editedUT = await t.usersTasks.edit(
        userId,
        taskId,
        canShare,
        canChangePermissions,
        canEdit,
        canDelete
      );

      if (!editedUT)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return editedUT;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const remove = async (user, taskId, userId) => {
  try {
    const result = await db.task(async (t) => {
      const usersTasks = await t.usersTasks.getSingle(user.id, taskId);
      if (
        !usersTasks ||
        !usersTasks.can_change_permissions ||
        user.id === userId
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      const authorId = await t.oneOrNone(
        "SELECT author_id FROM tasks WHERE task_id=$1",
        [taskId]
      );
      if (userId === authorId.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedUT = await t.usersTasks.delete(taskId, userId);
      if (!removedUT) throw new ApiError(400, errorTexts.common.badRequest);

      return removedUT;
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
