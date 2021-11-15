const db = require("../db");
const ApiError = require("../errors/ApiError");

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
  };
};

const getById = async (user, taskId) => {
  if (
    !taskId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      taskId
    )
  )
    throw new ApiError(400, "bad request - invalid id");

  try {
    const { rows } = await db.query(
      "SELECT * FROM tasks WHERE task_id=$1 AND author_id=$2",
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

  try {
    const columns = ["author_id", "task_name"];
    const values = ["$1", "$2"];
    const params = [user.id, name];

    if (description) {
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

    return {
      id: rows[0].task_id,
      authorId: rows[0].author_id,
      name: rows[0].task_name,
      description: rows[0].task_description,
      completed: rows[0].task_completed,
      createdAt: rows[0].created_at,
      completedAt: rows[0].completed_at,
      dateToComplete: rows[0].date_to_complete,
      startTime: rows[0].start_time,
      endTime: rows[0].end_time,
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getById,
  create,
};
