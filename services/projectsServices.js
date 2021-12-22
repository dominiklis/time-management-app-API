const { db } = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase } = require("../utils");

const get = async (user) => {
  try {
    const result = await db.projects.listForUser(user.id);

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const getById = async (user, projectId) => {
  try {
    const result = await db.projects.getSingleById(user.id, projectId);

    if (!result) throw new ApiError(400, errorTexts.common.badRequest);

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const create = async (user, projectName, projectDescription) => {
  try {
    const result = await db.task(async (t) => {
      const createdProject = await t.projects.add(
        user.id,
        projectName,
        projectDescription
      );

      if (!createdProject)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      const createdUsersProjects = await t.usersProjects.add(
        user.id,
        createdProject.project_id,
        true,
        true,
        true,
        true
      );
      if (!createdUsersProjects) {
        await t.projects.delete(createdProject.project_id);
        throw new ApiError(500, errorTexts.common.somethingWentWrong);
      }

      const projectToRetun = await t.projects.getSingleById(
        user.id,
        createdProject.project_id
      );

      return projectToRetun;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const edit = async (user, projectId, projectName, projectDescription) => {
  try {
    const result = await db.task(async (t) => {
      const usersProjects = await t.usersProjects.getSingle(user.id, projectId);
      if (!usersProjects || !usersProjects.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const updatedProject = await t.projects.edit(
        projectId,
        projectName,
        projectDescription
      );
      if (!updatedProject)
        throw new ApiError(400, errorTexts.common.badRequest);

      const projectToRetun = await t.projects.getSingleById(user.id, projectId);

      return projectToRetun;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const remove = async (user, projectId) => {
  try {
    const result = await db.task(async (t) => {
      const usersProjects = await t.usersProjects.getSingle(user.id, projectId);

      if (!usersProjects || !usersProjects.can_delete)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedProject = await t.projects.delete(projectId);

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
