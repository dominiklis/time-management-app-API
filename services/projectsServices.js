const { db } = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const get = async (user) => {
  try {
    const projects = await db.manyOrNone(
      `SELECT us.name AS author_name, us.email AS author_email, ps.*, up.* FROM 
        users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
          LEFT JOIN users AS us ON ps.author_id=us.user_id
            WHERE up.user_id=$1`,
      [user.id]
    );

    return projects.map((project) => mapToCamelCase(project));
  } catch (error) {
    throw error;
  }
};

const getById = async (user, projectId) => {
  if (!projectId || !validateId(projectId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const project = await db.oneOrNone(
      `SELECT us.name AS author_name, us.email AS author_email, ps.*, up.* FROM 
        users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
          LEFT JOIN users AS us ON ps.author_id=us.user_id
            WHERE up.user_id=$1 AND ps.project_id=$2`,
      [user.id, projectId]
    );

    if (!project) throw new ApiError(400, errorTexts.common.badRequest);

    return mapToCamelCase(project);
  } catch (error) {
    throw error;
  }
};

const create = async (user, name, description) => {
  if (!name || !name.trim())
    throw new ApiError(400, errorTexts.projects.nameIsRequired);
  else name = name.trim();

  const projectToInsert = {
    author_id: user.id,
    project_name: name,
  };

  if (description) projectToInsert.project_description = description.trim();

  try {
    const result = await db.task(async (t) => {
      const createdProject = await t.oneOrNone(
        "INSERT INTO projects (${this:name}) VALUES(${this:csv}) RETURNING *",
        projectToInsert
      );

      if (!createdProject)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      const createdUsersProjects = await t.oneOrNone(
        `INSERT INTO users_projects (user_id, project_id, can_share, can_change_permissions, can_edit, can_delete) 
          VALUES ($1, $2, $3, $3, $3, $3) RETURNING *`,
        [user.id, createdProject.project_id, true]
      );

      if (!createdUsersProjects) {
        await t.none("DELETE FROM projects WHERE project_id=$1", [
          createdProject.project_id,
        ]);
        throw new ApiError(500, errorTexts.common.somethingWentWrong);
      }

      return {
        ...createdProject,
        ...createdUsersProjects,
      };
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const edit = async (user, projectId, name, description) => {
  if (name) name = name.trim();
  if (description) description = description.trim();

  if (!projectId || !validateId(projectId))
    throw new ApiError(400, errorTexts.common.invalidId);

  if (!name && !description) return;

  try {
    const result = await db.task(async (t) => {
      let projectToUpdate = await t.oneOrNone(
        `SELECT us.name, us.email, ps.*, up.* FROM 
          users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
            LEFT JOIN users AS us ON ps.author_id=us.user_id
              WHERE up.user_id=$1 AND ps.project_id=$2;`,
        [user.id, projectId]
      );

      if (!projectToUpdate)
        throw new ApiError(400, errorTexts.common.badRequest);

      projectToUpdate = mapToCamelCase(projectToUpdate);

      if (!projectToUpdate.canEdit)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (name) projectToUpdate.projectName = name;
      if (description) projectToUpdate.projectDescription = description;

      const updatedProject = await t.oneOrNone(
        `UPDATE projects AS ps SET
          project_name=$3,
          project_description=$4
            FROM users_projects AS up
              WHERE ps.project_id = up.project_id
                AND up.user_id=$1
                AND up.can_edit=true
                AND ps.project_id=$2 RETURNING *`,
        [
          user.id,
          projectId,
          projectToUpdate.projectName,
          projectToUpdate.projectDescription,
        ]
      );

      if (!updatedProject)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return updatedProject;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const remove = async (user, projectId) => {
  if (!projectId || !validateId(projectId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      const usersProjects = await t.oneOrNone(
        `SELECT * FROM users_projects WHERE user_id=$1 AND project_id=$2`,
        [user.id, projectId]
      );

      if (!usersProjects || !usersProjects.can_delete)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedProject = await t.oneOrNone(
        "DELETE FROM projects WHERE project_id=$1 RETURNING *",
        [projectId]
      );

      if (!removedProject)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return removedProject;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  get,
  getById,
  create,
  edit,
  remove,
};
