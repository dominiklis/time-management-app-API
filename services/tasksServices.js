const db = require("../db");
const ApiError = require("../errors/ApiError");
const { taskAccessLevels } = require("../constants");
const checkIfIdIsValid = require("../utils/checkIfIdIsValid");

const mapTaskToSnakeCase = (task) => {
  return {
    id: task.task_id,
    authorId: task.author_id,
    name: task.task_name,
    description: task.task_description,
    completed: task.task_completed,
    createdAt: task.created_at,
    completedAt: task.completed_at,
    dateToComplete: task.date_to_complete,
    startTime: task.start_time,
    endTime: task.end_time,
    accessedAt: task.accessed_at,
    accessLevel: task.access_level,
  };
};

const get = async (user) => {
  try {
    const { rows } = await db.query(
      `SELECT ts.*, ut.accessed_at, ut.access_level FROM 
        users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id 
          WHERE ut.user_id=$1;`,
      [user.id]
    );

    const tasks = rows.map((task) => mapTaskToSnakeCase(task));
    return tasks;
  } catch (error) {
    throw error;
  }
};

const getById = async (user, taskId) => {
  if (!taskId || !checkIfIdIsValid(taskId))
    throw new ApiError(400, "bad request - invalid id");

  try {
    const { rows } = await db.query(
      `SELECT ts.*, ut.accessed_at, ut.access_level FROM 
        users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id 
          WHERE ts.task_id=$1 AND ut.user_id=$2`,
      [taskId, user.id]
    );

    if (rows.length === 0) throw new ApiError(400, "bad request");

    return mapTaskToSnakeCase(rows[0]);
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
  if (!name) throw new ApiError(400, "name for task is required");
  else name = name.trim();

  try {
    const columns = ["author_id", "task_name"];
    const values = ["$1", "$2"];
    const params = [user.id, name];

    if (description) {
      description = description.trim();
      columns.push("task_description");
      values.push(`$${values.length + 1}`);
      params.push(description);
    }

    if (dateToComplete) {
      columns.push("date_to_complete");
      values.push(`$${values.length + 1}`);
      params.push(dateToComplete);
    }

    if (startTime) {
      columns.push("start_time");
      values.push(`$${values.length + 1}`);
      params.push(startTime);
    }

    if (endTime) {
      columns.push("end_time");
      values.push(`$${values.length + 1}`);
      params.push(endTime);
    }

    let query = `INSERT INTO tasks (${columns.join(
      ", "
    )}) VALUES (${values.join(", ")}) RETURNING *;`;

    const { rows } = await db.query(query, params);

    if (rows[0].length === 0) throw new ApiError(500, "something went wrong");

    const { rows: usersTasksRows } = await db.query(
      "INSERT INTO users_tasks(user_id, task_id, access_level) VALUES ($1, $2, $3) RETURNING *;",
      [user.id, rows[0].task_id, taskAccessLevels.delete]
    );

    if (usersTasksRows.length === 0) {
      await db.query("DELETE FROM tasks WHERE task_id=$1", [rows[0].task_id]);
      throw new ApiError(500, "something went wrong");
    }

    return mapTaskToSnakeCase({
      ...rows[0],
      accessed_at: usersTasksRows[0].accessed_at,
      access_level: usersTasksRows[0].access_level,
    });
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

  if (!name && !description && !dateToComplete && !startTime && !endTime)
    return;

  try {
    const taskToEdit = await getById(user, taskId);

    if (name) taskToEdit.name = name;

    if (description) taskToEdit.description = description;

    if (dateToComplete) taskToEdit.dateToComplete = dateToComplete;

    if (startTime) taskToEdit.startTime = startTime;

    if (endTime) taskToEdit.endTime = endTime;

    const { rows } = await db.query(
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
        taskAccessLevels.edit,
        taskAccessLevels.delete,
        taskId,
        taskToEdit.name,
        taskToEdit.description,
        taskToEdit.dateToComplete,
        taskToEdit.startTime,
        taskToEdit.endTime,
      ]
    );

    if (rows.length === 0) throw new ApiError(400, "bad request");

    return mapTaskToSnakeCase(rows[0]);
  } catch (error) {
    throw error;
  }
};

const remove = async (user, taskId) => {
  if (!taskId || !checkIfIdIsValid(taskId))
    throw new ApiError(400, "bad request - invalid id");

  try {
    const { rows: usersTasksRows } = await db.query(
      `SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2`,
      [user.id, taskId]
    );

    if (
      usersTasksRows.length === 0 ||
      usersTasksRows[0].access_level !== taskAccessLevels.delete
    )
      throw new ApiError(400, "bad request");

    const { rows } = await db.query(
      "DELETE FROM tasks WHERE task_id=$1 RETURNING *;",
      [taskId]
    );

    if (rows.length === 0) throw new ApiError(400, "bad request");

    return mapTaskToSnakeCase(rows[0]);
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
