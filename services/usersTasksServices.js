const { db } = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const {
  mapToCamelCase,
  validateId,
  validateUsername,
  validateEmail,
} = require("../utils");

const getUsers = async (user, taskId) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);

  if (!taskId || !validateId(taskId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const usersTasks = await db.manyOrNone(
      `SELECT ut.task_id, us.name, us.email, us.user_id, ut.* FROM users_tasks AS ut 
        LEFT JOIN users AS us ON ut.user_id = us.user_id
          WHERE task_id=$1`,
      [taskId]
    );

    if (!usersTasks.some((ut) => ut.user_id === user.id))
      throw new ApiError(400, errorTexts.common.badRequest);

    return usersTasks.map((ut) => mapToCamelCase(ut));
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
  if (!userId && !userEmail && !userName)
    throw new ApiError(400, errorTexts.common.badRequest);

  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  if (userId && !validateId(userId))
    throw new ApiError(400, errorTexts.common.invalidId);

  if (userName && !validateUsername(userName))
    throw new ApiError(400, errorTexts.users.invalidName);

  if (userEmail && !validateEmail(userEmail))
    throw new ApiError(400, errorTexts.users.invalidEmail);

  try {
    const result = await db.task(async (t) => {
      const usersTasks = await t.oneOrNone(
        `SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2`,
        [user.id, taskId]
      );

      if (!usersTasks || !usersTasks.can_share)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (!usersTasks.can_change_permissions)
        canShare = canChangePermissions = canEdit = canDelete = false;

      foundUser = await t.oneOrNone(
        `SELECT * FROM users WHERE name=$1 OR email=$2 OR user_id=$3`,
        [userName, userEmail, userId]
      );

      if (!foundUser) throw new ApiError(400, errorTexts.common.userNotFound);

      const createdUT = await t.oneOrNone(
        `INSERT INTO users_tasks (user_id, task_id, can_share, can_change_permissions, can_edit, can_delete) 
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          foundUser.user_id,
          taskId,
          canShare,
          canChangePermissions,
          canEdit,
          canDelete,
        ]
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
  if (
    typeof canShare !== "boolean" &&
    typeof canChangePermissions !== "boolean" &&
    typeof canEdit !== "boolean" &&
    typeof canDelete !== "boolean"
  )
    throw new ApiError(400, errorTexts.common.badRequest);

  if (!taskId || !userId) throw new ApiError(400, errorTexts.common.badRequest);

  if (!validateId(taskId) || !validateId(userId))
    throw new ApiError(400, errorTexts.common.invalidId);

  if (userId === user.id) throw new ApiError(400, errorTexts.common.badRequest);

  try {
    const result = await db.task(async (t) => {
      const yoursUsersTasks = await t.oneOrNone(
        `SELECT ut.*, ts.author_id FROM users_tasks AS ut
          LEFT JOIN tasks AS ts ON ut.task_id=ts.task_id 
            WHERE ut.user_id=$1 AND ut.task_id=$2`,
        [user.id, taskId]
      );

      if (!yoursUsersTasks || !yoursUsersTasks.can_change_permissions)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (userId === yoursUsersTasks.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      let usersTasksToUpdate = await t.oneOrNone(
        `SELECT ut.*, ts.author_id FROM users_tasks AS ut
          LEFT JOIN tasks AS ts ON ut.task_id=ts.task_id 
            WHERE ut.user_id=$1 AND ut.task_id=$2`,
        [userId, taskId]
      );

      if (!usersTasksToUpdate)
        throw new ApiError(400, errorTexts.common.badRequest);

      usersTasksToUpdate = mapToCamelCase(usersTasksToUpdate);

      if (typeof canShare === "boolean") usersTasksToUpdate.canShare = canShare;

      if (typeof canChangePermissions === "boolean")
        usersTasksToUpdate.canChangePermissions = canChangePermissions;

      if (typeof canEdit === "boolean") usersTasksToUpdate.canEdit = canEdit;

      if (typeof canDelete === "boolean")
        usersTasksToUpdate.canDelete = canDelete;

      const editedUT = await t.oneOrNone(
        `UPDATE users_tasks SET can_share=$1, can_change_permissions=$2, can_edit=$3, can_delete=$4 
          WHERE task_id=$5 AND user_id=$6 RETURNING *`,
        [
          usersTasksToUpdate.canShare,
          usersTasksToUpdate.canChangePermissions,
          usersTasksToUpdate.canEdit,
          usersTasksToUpdate.canDelete,
          taskId,
          userId,
        ]
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
  if (!taskId || !userId) throw new ApiError(400, errorTexts.common.badRequest);

  if (!validateId(taskId) || !validateId(userId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      const yoursUsersTasks = await t.oneOrNone(
        `SELECT ut.*, ts.author_id FROM users_tasks AS ut
          LEFT JOIN tasks AS ts ON ut.task_id=ts.task_id
            WHERE ut.user_id=$1 AND ut.task_id=$2`,
        [user.id, taskId]
      );

      if (!yoursUsersTasks || !yoursUsersTasks.can_change_permissions)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (userId === yoursUsersTasks.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedUT = await t.oneOrNone(
        `DELETE FROM users_tasks WHERE task_id=$1 AND user_id=$2 RETURNING *`,
        [taskId, userId]
      );

      if (!removedUT)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

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
