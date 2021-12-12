const db = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const get = async (user) => {
  try {
    const tasks = await db.manyOrNone(
      `SELECT us.name AS author_name, 
        us.email AS author_email, 
        ts.*, 
        ut.accessed_at,
        ut.can_share,
        ut.can_change_permissions,
        ut.can_edit,
        ut.can_delete, 
        q_steps.steps,
        q_users.users FROM 
          users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id  
            LEFT JOIN users AS us ON ts.author_id=us.user_id
              LEFT JOIN (
                SELECT steps.task_id, json_agg(steps.* ORDER BY position ASC) AS steps FROM 
                  steps GROUP BY task_id
              ) AS q_steps ON q_steps.task_id=ts.task_id 
            LEFT JOIN (
              SELECT ut.task_id, json_agg(json_build_object(
                'user_id', ut.user_id,
                'user_name', us.name,
                'can_share', ut.can_share, 
                'can_edit', ut.can_edit, 
                'can_change_permissions', ut.can_change_permissions, 
                'can_delete', ut.can_delete)) 
              AS users FROM users_tasks AS ut LEFT JOIN users AS us ON ut.user_id=us.user_id GROUP BY task_id
            ) AS q_users ON q_users.task_id=ts.task_id
      WHERE ut.user_id=$1`,
      [user.id]
    );

    const tasksToReturn = tasks.map((task) => {
      const mappedTask = mapToCamelCase(task);
      mappedTask.steps = task.steps?.map((step) => mapToCamelCase(step));
      mappedTask.users = task.users?.map((user) => mapToCamelCase(user));
      return mappedTask;
    });
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
      `SELECT us.name AS author_name, 
          us.email AS autor_email, 
          ts.*, 
          ut.accessed_at, 
          ut.can_share, 
          ut.can_change_permissions, 
          ut.can_edit, 
          ut.can_delete FROM 
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
  taskName,
  taskDescription,
  dateToComplete,
  startTime,
  endTime
) => {
  if (!taskName || !taskName.trim())
    throw new ApiError(400, errorTexts.tasks.nameIsRequired);
  else taskName = taskName.trim();

  const taskToInsert = {
    author_id: user.id,
    task_name: taskName,
  };

  if (taskDescription) taskToInsert.task_description = taskDescription.trim();

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
        author_name: user.taskName,
        author_email: user.email,
        users: [
          {
            user_name: user.name,
            ...createdUsersTasks,
          },
        ],
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
  taskName,
  taskDescription,
  taskCompleted,
  dateToComplete,
  startTime,
  endTime
) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  if (taskName) taskName = taskName.trim();
  if (taskDescription) taskDescription = taskDescription.trim();

  if (
    !taskName &&
    !taskDescription &&
    !dateToComplete &&
    !startTime &&
    !endTime &&
    typeof taskCompleted !== "boolean"
  )
    return;

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

      taskToUpdate.taskName = taskName;

      taskToUpdate.taskDescription = taskDescription;

      taskToUpdate.taskCompleted = taskCompleted;
      if (taskCompleted)
        additionalUpdates += ", completed_at=CURRENT_TIMESTAMP";
      else additionalUpdates += ", completed_at=NULL";

      taskToUpdate.dateToComplete = dateToComplete;

      taskToUpdate.startTime = startTime;

      taskToUpdate.endTime = endTime;

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
