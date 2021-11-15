const db = require("../db");
const ApiError = require("../errors/ApiError");

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
  create,
};
