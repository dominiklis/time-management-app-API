const db = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const {
  mapToCamelCase,
  validateId,
  validateUsername,
  validateEmail,
} = require("../utils");

const getUsers = async (user, projectId) => {
  if (!projectId) throw new ApiError(400, errorTexts.common.badRequest);

  if (!validateId(projectId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const usersProjects = await db.manyOrNone(
      `SELECT up.project_id, us.name, us.email, us.user_id, up.* FROM users_projects AS up 
        LEFT JOIN users AS us ON up.user_id = us.user_id
          WHERE project_id=$1`,
      [projectId]
    );

    if (!usersProjects.some((up) => up.user_id === user.id))
      throw new ApiError(400, errorTexts.common.badRequest);

    return usersProjects.map((up) => mapToCamelCase(up));
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

  try {
    const result = await db.task(async (t) => {
      const usersProjects = await t.oneOrNone(
        `SELECT * FROM users_projects WHERE user_id=$1 AND project_id=$2`,
        [user.id, projectId]
      );

      if (!usersProjects || !usersProjects.can_share)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (!usersProjects.can_change_permissions)
        canShare = canChangePermissions = canEdit = canDelete = false;

      if (!userId) {
        foundUser = await t.oneOrNone(
          `SELECT user_id FROM users WHERE name=$1 OR email=$2`,
          [userName, userEmail]
        );

        if (!foundUser) throw new ApiError(400, errorTexts.common.badRequest);
      }

      userId = foundUser.user_id;

      const createdUP = await t.oneOrNone(
        `INSERT INTO users_projects (user_id, project_id, can_share, can_change_permissions, can_edit, can_delete) 
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, projectId, canShare, canChangePermissions, canEdit, canDelete]
      );

      if (!createdUP)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return createdUP;
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
  if (
    typeof canShare !== "boolean" &&
    typeof canChangePermissions !== "boolean" &&
    typeof canEdit !== "boolean" &&
    typeof canDelete !== "boolean"
  )
    throw new ApiError(400, errorTexts.common.badRequest);

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

      if (!yoursUsersProjects || !yoursUsersProjects.can_change_permissions)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (userId === yoursUsersProjects.author_id)
        throw new ApiError(400, errorTexts.common.badRequest);

      let usersProjectsToUpdate = await t.oneOrNone(
        `SELECT up.*, ps.author_id FROM users_projects AS up
          LEFT JOIN projects AS ps ON up.project_id=ps.project_id 
            WHERE up.user_id=$1 AND up.project_id=$2`,
        [userId, projectId]
      );

      if (!usersProjectsToUpdate)
        throw new ApiError(400, errorTexts.common.badRequest);

      usersProjectsToUpdate = mapToCamelCase(usersProjectsToUpdate);

      if (typeof canShare === "boolean")
        usersProjectsToUpdate.canShare = canShare;

      if (typeof canChangePermissions === "boolean")
        usersProjectsToUpdate.canChangePermissions = canChangePermissions;

      if (typeof canEdit === "boolean") usersProjectsToUpdate.canEdit = canEdit;

      if (typeof canDelete === "boolean")
        usersProjectsToUpdate.canDelete = canDelete;

      const editedUP = await t.oneOrNone(
        `UPDATE users_projects SET can_share=$1, can_change_permissions=$2, can_edit=$3, can_delete=$4 
          WHERE project_id=$5 AND user_id=$6 RETURNING *`,
        [
          usersProjectsToUpdate.canShare,
          usersProjectsToUpdate.canChangePermissions,
          usersProjectsToUpdate.canEdit,
          usersProjectsToUpdate.canDelete,
          projectId,
          userId,
        ]
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

      if (!yoursUsersProjects || !yoursUsersProjects.can_change_permissions)
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
