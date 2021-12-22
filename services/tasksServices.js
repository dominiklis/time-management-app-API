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
      if (!createdTaskToReturn)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

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
      const usersTasks = await t.usersTasks.getSingle(user.id, taskId);

      if (!usersTasks) throw new ApiError(400, errorTexts.common.badRequest);

      if (!usersTasks.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const isCompleted = await t.oneOrNone(
        "SELECT task_completed, completed_at FROM tasks WHERE task_id=$1",
        [taskId]
      );

      let completedAt = isCompleted.completed_at;
      if (usersTasks.task_completed !== taskCompleted) {
        if (taskCompleted) completedAt = completedAt = new Date().toISOString();
        else completedAt = null;
      }

      console.log(isCompleted);

      const updatedTask = await t.tasks.edit(
        user.id,
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
  create,
  edit,
  remove,
};
