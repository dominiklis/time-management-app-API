const db = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const get = async (user) => {
  try {
    const tasks = await db.manyOrNone(
      `SELECT us.name AS author_name, us.email AS autor_email, ts.*, ut.* FROM 
        users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id 
          LEFT JOIN users AS us ON ts.author_id=us.user_id
            WHERE ut.user_id=$1`,
      [user.id]
    );

    const tasksToReturn = tasks.map((task) => mapToCamelCase(task));
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
      `SELECT us.name AS author_name, us.email AS autor_email, ts.*, ut.* FROM 
        users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id  
          LEFT JOIN users AS us ON ts.author_id=us.user_id
            WHERE ts.task_id=$1 AND ut.user_id=$2`,
      [taskId, user.id]
    );

    if (!task) throw new ApiError(400, errorTexts.common.badRequest);

    return mapToCamelCase(task);
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
        `INSERT INTO users_tasks (user_id, task_id, can_share, can_change_permissions, can_edit, can_delete) 
          VALUES ($1, $2, $3, $3, $3, $3) RETURNING *`,
        [user.id, createdTask.task_id, true]
      );

      if (!createdUsersTasks) {
        await t.none("DELETE FROM tasks WHERE task_id=$1", [
          createdTask.task_id,
        ]);
        throw new ApiError(500, errorTexts.common.somethingWentWrong);
      }

      return {
        ...createdTask,
        ...createdUsersTasks,
      };
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const edit = async (
  user,
  taskId,
  name,
  description,
  completed,
  dateToComplete,
  startTime,
  endTime
) => {
  if (name) name = name.trim();
  if (description) description = description.trim();

  if (
    !name &&
    !description &&
    !dateToComplete &&
    !startTime &&
    !endTime &&
    typeof completed !== "boolean"
  )
    return;

  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.task(async (t) => {
      let taskToUpdate = await t.oneOrNone(
        `SELECT us.name AS author_name, us.email AS author_email, ts.*, ut.* FROM 
          users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id  
            LEFT JOIN users AS us ON ts.author_id=us.user_id
              WHERE ts.task_id=$1 AND ut.user_id=$2`,
        [taskId, user.id]
      );

      if (!taskToUpdate) throw new ApiError(400, errorTexts.common.badRequest);

      taskToUpdate = mapToCamelCase(taskToUpdate);

      if (!taskToUpdate.canEdit)
        throw new ApiError(400, errorTexts.common.badRequest);

      let additionalUpdates = "";

      if (name) taskToUpdate.taskName = name;

      if (description) taskToUpdate.taskDescription = description;

      if (typeof completed === "boolean") {
        taskToUpdate.taskCompleted = completed;
        if (completed) additionalUpdates += ", completed_at=CURRENT_TIMESTAMP";
        else additionalUpdates += ", completed_at=NULL";
      }
      if (dateToComplete) taskToUpdate.dateToComplete = dateToComplete;

      if (startTime) taskToUpdate.startTime = startTime;

      if (endTime) taskToUpdate.endTime = endTime;

      const updatedTask = await t.oneOrNone(
        `UPDATE tasks AS ts SET
          task_name=$3,
          task_description=$4,
          task_completed=$5,
          date_to_complete=$6,
          start_time=$7,
          end_time=$8
          ${additionalUpdates}
            FROM users_tasks AS ut
              WHERE ts.task_id = ut.task_id
                AND ut.user_id=$1
                AND ut.can_edit=true
                AND ts.task_id=$2 RETURNING *`,
        [
          user.id,
          taskId,
          taskToUpdate.taskName,
          taskToUpdate.taskDescription,
          taskToUpdate.taskCompleted,
          taskToUpdate.dateToComplete,
          taskToUpdate.startTime,
          taskToUpdate.endTime,
        ]
      );

      if (!updatedTask)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return updatedTask;
    });

    return mapToCamelCase(result);
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

      if (!usersTasks || !usersTasks.can_delete)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedTask = await t.oneOrNone(
        "DELETE FROM tasks WHERE task_id=$1 RETURNING *",
        [taskId]
      );

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
