const db = require("../db");
const ApiError = require("../errors/ApiError");
const { accessLevels, errorTexts } = require("../utils/constants");
const {
  mapToCamelCase,
  validateId,
  validateUsername,
  validateEmail,
} = require("../utils");

const getUsers = async (user, taskId) => {
  if (!taskId || !validateId(taskId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const users = await db.manyOrNone(
      `SELECT ut.task_id, us.name, us.email, us.user_id, ut.accessed_at, ut.access_level FROM users_tasks AS ut 
        LEFT JOIN users AS us ON ut.user_id = us.user_id
          WHERE task_id=$1`,
      [taskId]
    );

    if (!users.some((ut) => ut.user_id === user.id))
      throw new ApiError(400, errorTexts.common.badRequest);

    const usersTasks = users.map((ut) => mapToCamelCase.user(ut));
    return usersTasks;
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
  accessLevel = accessLevels.view
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

      if (!usersTasks || usersTasks.access_level === accessLevels.view)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (!userId) {
        foundUser = await t.oneOrNone(
          `SELECT user_id FROM users WHERE name=$1 OR email=$2`,
          [userName, userEmail]
        );

        if (!foundUser) throw new ApiError(400, errorTexts.common.badRequest);
      }

      userId = foundUser.user_id;

      const createdUT = await t.oneOrNone(
        `INSERT INTO users_tasks(user_id, task_id, access_level) VALUES ($1, $2, $3) RETURNING *`,
        [userId, taskId, accessLevel]
      );

      if (!createdUT)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return createdUT;
    });

    return mapToCamelCase.user(result);
  } catch (error) {
    if (error?.code === "23505") {
      throw new ApiError(400, errorTexts.usersTasks.userHasAccess);
    }

    if (error?.code === "23514") {
      throw new ApiError(400, errorTexts.access.invalidAccessLevel);
    }
    throw error;
  }
};

const edit = async (user, taskId, userId, accessLevel) => {
  if (!accessLevel) throw new ApiError(400, errorTexts.common.badRequest);

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

      if (
        !yoursUsersTasks ||
        yoursUsersTasks.access_level === accessLevels.view
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      if (
        yoursUsersTasks.access_level === accessLevels.edit &&
        accessLevel === accessLevels.delete
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      if (userId === yoursUsersTasks.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      const usersTasksToUpdate = await t.oneOrNone(
        `SELECT ut.*, ts.author_id FROM users_tasks AS ut
            LEFT JOIN tasks AS ts ON ut.task_id=ts.task_id 
              WHERE ut.user_id=$1 AND ut.task_id=$2`,
        [userId, taskId]
      );

      if (
        yoursUsersTasks.access_level === accessLevels.edit &&
        usersTasksToUpdate.access_level === accessLevels.delete
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      const editedUT = await t.oneOrNone(
        `UPDATE users_tasks SET access_level=$1 WHERE task_id=$2 AND user_id=$3 RETURNING *`,
        [accessLevel, taskId, userId]
      );

      if (!editedUT)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return editedUT;
    });

    return mapToCamelCase.user(result);
  } catch (error) {
    if (error?.code === "23514") {
      throw new ApiError(400, errorTexts.access.invalidAccessLevel);
    }
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

      if (
        !yoursUsersTasks ||
        yoursUsersTasks.access_level !== accessLevels.delete
      )
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

    return mapToCamelCase.user(result);
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
