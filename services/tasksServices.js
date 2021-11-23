const db = require("../db");
const ApiError = require("../errors/ApiError");
const { accessLevels, errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const get = async (user) => {
  try {
    const tasks = await db.manyOrNone(
      `SELECT us.name, us.email, ts.*, ut.accessed_at, ut.access_level FROM 
        users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id 
          LEFT JOIN users AS us ON ts.author_id=us.user_id
            WHERE ut.user_id=$1`,
      [user.id]
    );

    const tasksToReturn = tasks.map((task) => mapToCamelCase.task(task));
    return tasksToReturn;
  } catch (error) {
    throw error;
  }
};

const getById = async (user, taskId) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const task = await db.oneOrNone(
      `SELECT us.name, us.email, ts.*, ut.accessed_at, ut.access_level FROM 
        users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id  
          LEFT JOIN users AS us ON ts.author_id=us.user_id
            WHERE ts.task_id=$1 AND ut.user_id=$2`,
      [taskId, user.id]
    );

    if (!task) throw new ApiError(400, errorTexts.common.badRequest);

    return mapToCamelCase.task(task);
  } catch (error) {
    throw error;
  }
};

const create = async (
  user,
  name,
  description,
  dateToComplete,
  startTime,
  endTime
) => {
  if (!name || !name.trim())
    throw new ApiError(400, errorTexts.tasks.nameIsRequired);
  else name = name.trim();

  const taskToInsert = {
    author_id: user.id,
    task_name: name,
  };

  if (description) taskToInsert.task_description = description.trim();
  if (dateToComplete) taskToInsert.date_to_complete = dateToComplete;
  if (startTime) taskToInsert.start_time = startTime;
  if (endTime) taskToInsert.end_time = endTime;

  try {
    const result = await db.task(async (t) => {
      const createdTask = await t.oneOrNone(
        "INSERT INTO tasks (${this:name}) VALUES(${this:csv}) RETURNING *",
        taskToInsert
      );

      if (!createdTask)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      const createdUsersTasks = await t.oneOrNone(
        "INSERT INTO users_tasks (user_id, task_id, access_level) VALUES ($1, $2, $3) RETURNING *",
        [user.id, createdTask.task_id, accessLevels.delete]
      );

      if (!createdUsersTasks) {
        await t.none("DELETE FROM tasks WHERE task_id=$1", [
          createdTask.task_id,
        ]);
        throw new ApiError(500, errorTexts.common.somethingWentWrong);
      }

      return {
        ...createdTask,
        accessed_at: createdUsersTasks.accessed_at,
        access_level: createdUsersTasks.access_level,
      };
    });

    return mapToCamelCase.task(result);
  } catch (error) {
    throw error;
  }
};

const edit = async (
  user,
  taskId,
  name,
  description,
  dateToComplete,
  startTime,
  endTime
) => {
  if (name) name = name.trim();
  if (description) description = description.trim();

  if (!name && !description && !dateToComplete && !startTime && !endTime)
    return;

  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      const taskToUpdate = await t.oneOrNone(
        `SELECT us.name, us.email, ts.*, ut.access_level FROM 
          users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id  
            LEFT JOIN users AS us ON ts.author_id=us.user_id
              WHERE ts.task_id=$1 AND ut.user_id=$2`,
        [taskId, user.id]
      );

      if (!taskToUpdate) throw new ApiError(400, errorTexts.common.badRequest);

      if (taskToUpdate.access_level === accessLevels.view)
        throw new ApiError(400, errorTexts.common.badRequest);

      if (name) taskToUpdate.name = name;
      if (description) taskToUpdate.description = description;
      if (dateToComplete) taskToUpdate.date_to_complete = dateToComplete;
      if (startTime) taskToUpdate.star_tTime = startTime;
      if (endTime) taskToUpdate.end_time = endTime;

      const updatedTask = await t.oneOrNone(
        `UPDATE tasks AS ts SET
          task_name=$5,
          task_description=$6,
          date_to_complete=$7,
          start_time=$8,
          end_time=$9
            FROM users_tasks AS ut
              WHERE ts.task_id = ut.task_id
                AND ut.user_id=$1
                AND (ut.access_level=$2 OR ut.access_level=$3)
                AND ts.task_id=$4 RETURNING *`,
        [
          user.id,
          accessLevels.edit,
          accessLevels.delete,
          taskId,
          taskToUpdate.name,
          taskToUpdate.description,
          taskToUpdate.dateToComplete,
          taskToUpdate.startTime,
          taskToUpdate.endTime,
        ]
      );

      if (!updatedTask)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return updatedTask;
    });

    return result;
  } catch (error) {
    throw error;
  }
};

const remove = async (user, taskId) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      const usersTasks = await t.oneOrNone(
        `SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2`,
        [user.id, taskId]
      );

      if (!usersTasks || usersTasks.access_level !== accessLevels.delete)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedTask = await t.oneOrNone(
        "DELETE FROM tasks WHERE task_id=$1 RETURNING *",
        [taskId]
      );

      if (!removedTask)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return removedTask;
    });

    return mapToCamelCase.task(result);
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
