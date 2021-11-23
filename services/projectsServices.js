const db = require("../db");
const ApiError = require("../errors/ApiError");
const { accessLevels, errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const get = async (user) => {
  try {
    const projects = await db.manyOrNone(
      `SELECT us.name, us.email, ps.*, up.accessed_at, up.access_level FROM 
        users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
          LEFT JOIN users AS us ON ps.author_id=us.user_id
            WHERE up.user_id=$1`,
      [user.id]
    );

    return projects.map((project) => mapToCamelCase.project(project));
  } catch (error) {
    throw error;
  }
};

const getById = async (user, projectId) => {
  if (!projectId || !validateId(projectId))
    throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const project = await db.oneOrNone(
      `SELECT us.name, us.email, ps.*, up.accessed_at, up.access_level FROM 
        users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
          LEFT JOIN users AS us ON ps.author_id=us.user_id
            WHERE up.user_id=$1 AND ps.project_id=$2`,
      [user.id, projectId]
    );

    if (!project) throw new ApiError(400, errorTexts.common.badRequest);

    return mapToCamelCase.project(project);
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
        "INSERT INTO users_projects (user_id, project_id, access_level) VALUES ($1, $2, $3) RETURNING *",
        [user.id, createdProject.project_id, accessLevels.delete]
      );

      if (!createdUsersProjects) {
        await t.none("DELETE FROM projects WHERE project_id=$1", [
          createdProject.project_id,
        ]);
        throw new ApiError(500, errorTexts.common.somethingWentWrong);
      }

      return {
        ...createdProject,
        accessed_at: createdUsersProjects.accessed_at,
        access_level: createdUsersProjects.access_level,
      };
    });

    return mapToCamelCase.project(result);
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
      const projectToUpdate = await t.oneOrNone(
        `SELECT us.name, us.email, ps.*, up.accessed_at, up.access_level FROM 
          users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
            LEFT JOIN users AS us ON ps.author_id=us.user_id
              WHERE up.user_id=$1 AND ps.project_id=$2;`,
        [user.id, projectId]
      );

      if (!projectToUpdate)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (!projectToUpdate.access_level === accessLevels.view)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (name) projectToUpdate.name = name;
      if (description) projectToUpdate.description = description;

      const updatedProject = await t.oneOrNone(
        `UPDATE projects AS ps SET
          project_name=$5,
          project_description=$6
            FROM users_projects AS up
              WHERE ps.project_id = up.project_id
                AND up.user_id=$1
                AND (up.access_level=$2 OR up.access_level=$3)
                AND ps.project_id=$4 RETURNING *`,
        [
          user.id,
          accessLevels.edit,
          accessLevels.delete,
          projectId,
          projectToUpdate.name,
          projectToUpdate.description,
        ]
      );

      if (!updatedProject)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return updatedProject;
    });

    return mapToCamelCase.project(result);
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

      if (!usersProjects || usersProjects.access_level !== accessLevels.delete)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedProject = await t.oneOrNone(
        "DELETE FROM projects WHERE project_id=$1 RETURNING *",
        [projectId]
      );

      if (!removedProject)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return removedProject;
    });

    return mapToCamelCase.project(result);
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
