const db = require("../db");
const ApiError = require("../errors/ApiError");
const { accessLevels, errorTexts } = require("../utils/constants");
const {
  mapToCamelCase,
  validateId,
  validateUsername,
  validateEmail,
} = require("../utils");

const getUsers = async (user, projectId) => {
  if (!projectId || !validateId(projectId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const usersProjects = await db.manyOrNone(
      `SELECT up.project_id, us.name, us.email, us.user_id, up.accessed_at, up.access_level FROM users_projects AS up 
        LEFT JOIN users AS us ON up.user_id = us.user_id
          WHERE project_id=$1`,
      [projectId]
    );

    if (!usersProjects.some((up) => up.user_id === user.id))
      throw new ApiError(400, errorTexts.common.badRequest);

    return usersProjects.map((up) => mapToCamelCase.project(up));
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
  accessLevel = accessLevels.view
) => {
  if (!userId && !userEmail && !userName)
    throw new ApiError(400, errorTexts.common.badRequest);

  if (!projectId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(projectId))
    throw new ApiError(400, errorTexts.common.invalidId);

  if (userId && !validateId(userId))
    throw new ApiError(400, errorTexts.common.invalidId);

  if (userName && !validateUsername(userName))
    throw new ApiError(400, errorTexts.users.invalidName);

  if (userEmail && !validateEmail(userEmail))
    throw new ApiError(400, errorTexts.users.invalidEmail);

  if (
    accessLevel !== accessLevels.view ||
    accessLevel !== accessLevels.edit ||
    accessLevel !== accessLevels.delete
  )
    throw new ApiError(400, errorTexts.access.invalidAccessLevel);

  try {
    const result = await db.task(async (t) => {
      const usersProjects = await t.oneOrNone(
        `SELECT * FROM users_projects WHERE user_id=$1 AND project_id=$2`,
        [user.id, projectId]
      );

      if (!usersProjects || usersProjects.access_level === accessLevels.view)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (!userId) {
        foundUser = await t.oneOrNone(
          `SELECT user_id FROM users WHERE name=$1 OR email=$2`,
          [userName, userEmail]
        );

        if (!foundUser) throw new ApiError(400, errorTexts.common.badRequest);
      }

      userId = foundUser.user_id;

      const createdUP = await t.oneOrNone(
        `INSERT INTO users_projects (user_id, project_id, access_level) VALUES ($1, $2, $3) RETURNING *`,
        [userId, projectId, accessLevel]
      );

      if (!createdUP)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return createdUP;
    });

    return mapToCamelCase.project(result);
  } catch (error) {
    if (error?.code === "23505") {
      throw new ApiError(400, errorTexts.access.userHasAccess);
    }

    if (error?.code === "23514") {
      throw new ApiError(400, errorTexts.access.invalidAccessLevel);
    }
    throw error;
  }
};

const edit = async (user, projectId, userId, accessLevel) => {
  if (!accessLevel) throw new ApiError(400, errorTexts.common.badRequest);

  if (
    accessLevel !== accessLevels.view ||
    accessLevel !== accessLevels.edit ||
    accessLevel !== accessLevels.delete
  )
    throw new ApiError(400, errorTexts.access.invalidAccessLevel);

  if (!projectId || !userId)
    throw new ApiError(400, errorTexts.common.badRequest);

  if (!validateId(projectId) || !validateId(userId))
    throw new ApiError(400, errorTexts.common.invalidId);

  if (userId === user.id) throw new ApiError(400, errorTexts.common.badRequest);

  try {
    const result = await db.task(async (t) => {
      const yoursUsersProjects = await t.oneOrNone(
        `SELECT up.*, ps.author_id FROM users_projects AS up
          LEFT JOIN projects AS ps ON up.project_id=ps.project_id
            WHERE up.user_id=$1 AND up.project_id=$2`,
        [user.id, projectId]
      );

      if (
        !yoursUsersProjects ||
        yoursUsersProjects.access_level === accessLevels.view
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      if (
        yoursUsersProjects.access_level === accessLevels.edit &&
        accessLevel === accessLevels.delete
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      if (userId === yoursUsersProjects.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      const usersProjectsToUpdate = await t.oneOrNone(
        `SELECT up.*, ps.author_id FROM users_projects AS up
          LEFT JOIN projects AS ps ON up.project_id=ps.project_id 
            WHERE up.user_id=$1 AND up.project_id=$2`,
        [userId, projectId]
      );

      if (
        yoursUsersProjects.access_level === accessLevels.edit &&
        usersProjectsToUpdate.access_level === accessLevels.delete
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      const editedUP = await t.oneOrNone(
        `UPDATE users_projects SET access_level=$1 WHERE project_id=$2 AND user_id=$3 RETURNING *`,
        [accessLevel, projectId, userId]
      );

      if (!editedUP)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return editedUP;
    });

    return mapToCamelCase.user(result);
  } catch (error) {
    if (error?.code === "23514") {
      throw new ApiError(
        400,
        "invalid access level (valid are 'view', 'view, edit' or 'view, edit, delete')"
      );
    }
    throw error;
  }
};

const remove = async (user, projectId, userId) => {
  if (!projectId || !userId)
    throw new ApiError(400, errorTexts.common.badRequest);

  if (!validateId(projectId) || !validateId(userId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      const yoursUsersProjects = await t.oneOrNone(
        `SELECT up.*, ps.author_id FROM users_projects AS up
          LEFT JOIN projects AS ps ON up.project_id=ps.project_id 
            WHERE up.user_id=$1 AND up.project_id=$2`,
        [user.id, projectId]
      );

      if (
        !yoursUsersProjects ||
        yoursUsersProjects.access_level !== accessLevels.delete
      )
        throw new ApiError(400, errorTexts.common.badRequest);

      if (userId === yoursUsersProjects.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedUP = await t.oneOrNone(
        `DELETE FROM users_projects WHERE project_id=$1 AND user_id=$2 RETURNING *`,
        [projectId, userId]
      );

      if (!removedUP)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return removedUP;
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
