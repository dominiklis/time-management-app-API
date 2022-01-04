const { db } = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const createFilters = (params) => {
  let filters = "";
  if (params.withoutDate || params.start || params.end) {
    if (params.withoutDate) params.withoutDate = "ts.date_to_complete IS NULL";

    let dateToCompleteFilter = "";
    if (params.start && params.end) {
      dateToCompleteFilter = `(ts.date_to_complete >= '${params.start}' AND ts.date_to_complete < '${params.end}')`;
    } else if (params.start) {
      dateToCompleteFilter = `(ts.date_to_complete >= '${params.start}')`;
    } else if (params.end) {
      dateToCompleteFilter = `(ts.date_to_complete < '${params.end}')`;
    }

    if (params.withoutDate && dateToCompleteFilter) {
      filters = ` AND (${params.withoutDate} OR (${dateToCompleteFilter}))`;
    } else if (params.withoutDate) {
      filters = ` AND (${params.withoutDate})`;
    } else if (dateToCompleteFilter) {
      filters = ` AND (${dateToCompleteFilter})`;
    }
  }

  return filters;
};

const get = async (user, params) => {
  try {
    const tasks = await db.tasks.listForUser(user.id);

    return mapToCamelCase(tasks);
  } catch (error) {
    throw error;
  }
};

const getById = async (user, taskId) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.tasks.getSingleById(taskId, user.id);

    if (!result) throw new ApiError(400, errorTexts.common.badRequest);

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const getByNameOrDescription = async (user, searchString) => {
  if (!searchString || typeof searchString !== "string") return [];
  searchString = searchString.trim();
  if (!searchString) return [];

  try {
    const result = await db.tasks.getByNameOrDescription(user.id, searchString);

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const create = async (
  user,
  taskName,
  taskDescription,
  taskCompleted,
  dateToComplete,
  startTime,
  endTime,
  projectId
) => {
  let completedAt = null;
  if (taskCompleted) completedAt = new Date().toISOString();

  try {
    const result = await db.task(async (t) => {
      let userProject = null;
      if (projectId) {
        userProject = await t.usersProjects.getSingle(user.id, projectId);

        if (!userProject?.can_edit) {
          throw new ApiError(400, errorTexts.common.badRequest);
        }
      }

      const createdTask = await t.tasks.add(
        user.id,
        taskName,
        taskDescription,
        taskCompleted,
        completedAt,
        dateToComplete,
        startTime,
        endTime,
        projectId
      );
      if (!createdTask)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      const createdUsersTasks = await t.usersTasks.add(
        user.id,
        createdTask.task_id,
        true,
        true,
        true,
        true
      );
      if (!createdUsersTasks) {
        await t.tasks.delete(createdTask.task_id);
        throw new ApiError(500, errorTexts.common.somethingWentWrong);
      }

      const createdTaskToReturn = await t.tasks.getSingleById(
        createdTask.task_id,
        user.id
      );

      return createdTaskToReturn;
    });

    return mapToCamelCase(result);
  } catch (error) {
    if (error?.code === "23503") {
      throw new ApiError(400, errorTexts.common.badRequest);
    }

    throw error;
  }
};

const edit = async (
  user,
  taskId,
  taskName,
  taskDescription,
  taskCompleted,
  dateToComplete,
  startTime,
  endTime,
  projectId
) => {
  try {
    const result = await db.task(async (t) => {
      // check if task was created by user or shared with him
      const usersTasks = await t.usersTasks.getSingle(user.id, taskId);
      if (usersTasks) {
        if (!usersTasks.can_edit)
          throw new ApiError(400, errorTexts.common.badRequest);
      }

      const taskBeforeUpdate = await t.oneOrNone(
        "SELECT * FROM tasks WHERE task_id=$1",
        [taskId]
      );

      // if task has not been created by or shared with user,
      // check if task comes from project that the user has access to
      if (!usersTasks) {
        const usersProjects = await t.usersProjects.getSingle(
          user.id,
          taskBeforeUpdate.project_id
        );

        if (!usersProjects || !usersProjects.can_edit)
          throw new ApiError(400, errorTexts.common.badRequest);
      }

      // check if user can change project_id
      if (taskBeforeUpdate.project_id !== projectId) {
        // setting project_id - check if user is the author of the task and can add tasks to this project
        if (!taskBeforeUpdate.project_id) {
          const userProjectForIdToSet = await t.usersProjects.getSingle(
            user.id,
            projectId
          );

          if (
            !userProjectForIdToSet?.can_edit ||
            taskBeforeUpdate.author_id !== user.id
          )
            throw new ApiError(400, errorTexts.common.badRequest);

          // removing project_id - check if user can remove tasks from this project
        } else if (!projectId) {
          const userProjectForIdToRemove = await t.usersProjects.getSingle(
            user.id,
            taskBeforeUpdate.project_id
          );

          if (!userProjectForIdToRemove?.can_edit)
            throw new ApiError(400, errorTexts.common.badRequest);

          // changing one project_id to other
          // check if user can remove tasks from this project and add to other project and is the author of the task
        } else {
          const userProjectForIdToRemove = await t.usersProjects.getSingle(
            user.id,
            taskBeforeUpdate.project_id
          );

          const userProjectForIdToSet = await t.usersProjects.getSingle(
            user.id,
            projectId
          );

          if (
            !userProjectForIdToSet?.can_edit ||
            !userProjectForIdToRemove?.can_edit ||
            taskBeforeUpdate.author_id !== user.id
          )
            throw new ApiError(400, errorTexts.common.badRequest);
        }
      }

      let completedAt = taskBeforeUpdate.completed_at;
      if (taskBeforeUpdate.task_completed !== taskCompleted) {
        if (taskCompleted) completedAt = completedAt = new Date().toISOString();
        else completedAt = null;
      }

      const updatedTask = await t.tasks.edit(
        taskId,
        taskName,
        taskDescription,
        taskCompleted,
        dateToComplete,
        startTime,
        endTime,
        projectId,
        completedAt
      );
      if (!updatedTask)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      const updatedTaskToReturn = await t.tasks.getSingleById(taskId, user.id);
      if (!updatedTaskToReturn)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return updatedTaskToReturn;
    });

    return mapToCamelCase(result);
  } catch (error) {
    if (error?.code === "23503") {
      throw new ApiError(400, errorTexts.common.badRequest);
    }

    throw error;
  }
};

const remove = async (user, taskId) => {
  try {
    const result = await db.task(async (t) => {
      const usersTasks = await t.usersTasks.getSingle(user.id, taskId);

      if (!usersTasks || !usersTasks.can_delete)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedTask = await t.tasks.delete(taskId);
      if (!removedTask)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return removedTask;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  get,
  getById,
  getByNameOrDescription,
  create,
  edit,
  remove,
};
