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
    const result = await db.manyOrNone(
      `SELECT us.name AS author_name, 
        us.email AS author_email, 
        ts.*, 
        pj.project_name,
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
            LEFT JOIN projects AS pj ON ts.project_id=pj.project_id
          WHERE ut.user_id=$1${createFilters(
            params
          )} ORDER BY ts.date_to_complete, ts.start_time`,
      [user.id]
    );

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const getById = async (user, taskId) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.oneOrNone(
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
  const taskToInsert = {
    author_id: user.id,
    task_name: taskName,
    task_description: taskDescription,
    task_completed: taskCompleted,
    date_to_complete: dateToComplete,
    start_time: startTime,
    end_time: endTime,
    project_id: projectId,
  };

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
      let usersTasks = await t.oneOrNone(
        `SELECT ut.*, ts.task_completed FROM users_tasks AS ut 
          LEFT JOIN tasks AS ts ON ut.task_id=ts.task_id 
          WHERE user_id=$1 AND ut.task_id=$2`,
        [user.id, taskId]
      );

      if (!usersTasks) throw new ApiError(400, errorTexts.common.badRequest);

      if (!usersTasks.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      let completedAt = "";
      if (usersTasks.task_completed !== taskCompleted) {
        if (taskCompleted) completedAt = ", completed_at=CURRENT_TIMESTAMP";
        else completedAt = ", completed_at=NULL";
      }

      const updatedTask = await t.oneOrNone(
        `UPDATE tasks AS ts SET
          task_name=$3,
          task_description=$4,
          task_completed=$5,
          date_to_complete=$6,
          start_time=$7,
          end_time=$8,
          project_id=$9
          ${completedAt}
            FROM users_tasks AS ut
              WHERE ts.task_id = ut.task_id
                AND ut.user_id=$1
                AND ut.can_edit=true
                AND ts.task_id=$2 RETURNING *`,
        [
          user.id,
          taskId,
          taskName,
          taskDescription,
          taskCompleted,
          dateToComplete,
          startTime,
          endTime,
          projectId,
        ]
      );

      if (!updatedTask)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return updatedTask;
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
