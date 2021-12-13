const { db } = require("../db");
const ApiError = require("../errors/ApiError");
const { mapToCamelCase, validateId } = require("../utils");
const { errorTexts } = require("../utils/constants");

const getTasks = async (user, projectId) => {
  if (!projectId) throw new ApiError(400, errorTexts.common.badRequest);

  if (!validateId(projectId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      const loggedUserUP = await t.oneOrNone(
        `SELECT * from users_projects WHERE user_id=$1 AND project_id=$2`,
        [user.id, projectId]
      );

      if (!loggedUserUP) throw new ApiError(400, errorTexts.common.badRequest);

      const projectsUsers = await t.manyOrNone(
        `SELECT pt.*, 
          us1.name AS assigner_name, 
          ts.task_name
            FROM projects_tasks AS pt
              LEFT JOIN users AS us1 ON pt.assigned_by=us1.user_id
              LEFT JOIN tasks AS ts ON pt.task_id=ts.task_id
                WHERE pt.project_id=$1`,
        [projectId]
      );

      return projectsUsers;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const create = async (user, projectId, taskId) => {
  if (!projectId || !taskId)
    throw new ApiError(400, errorTexts.common.badRequest);

  if (!validateId(projectId) || !validateId(taskId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      const loggedUserUP = await t.oneOrNone(
        `SELECT * FROM users_projects WHERE user_id=$1 AND project_id=$2`,
        [user.id, projectId]
      );

      if (!loggedUserUP || !loggedUserUP.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const loggedUserUT = await t.oneOrNone(
        `SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2`,
        [user.id, taskId]
      );

      if (!loggedUserUT || !loggedUserUT.can_share || !loggedUserUT.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const createdPT = await t.oneOrNone(
        `INSERT INTO projects_tasks (project_id, task_id, assigned_by) VALUES ($1, $2, $3) RETURNING *`,
        [projectId, taskId, user.id]
      );

      if (!createdPT)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return createdPT;
    });

    return mapToCamelCase(result);
  } catch (error) {
    if (error?.code === "23505")
      throw new ApiError(400, errorTexts.projects.taskAlreadyAssigned);
    throw error;
  }
};

const remove = async (user, projectId, taskId) => {
  if (!projectId || !taskId)
    throw new ApiError(400, errorTexts.common.badRequest);

  if (!validateId(projectId) || !validateId(taskId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      const loggedUserUP = await t.oneOrNone(
        `SELECT * FROM users_projects WHERE user_id=$1 AND project_id=$2`,
        [user.id, projectId]
      );

      if (!loggedUserUP || !loggedUserUP.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedPT = await t.oneOrNone(
        `DELETE FROM projects_tasks WHERE project_id=$1 AND task_id=$2 RETURNING *`,
        [projectId, taskId]
      );

      if (!removedPT)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return removedPT;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getTasks,
  create,
  remove,
};
