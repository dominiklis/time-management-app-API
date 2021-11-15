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

const get = async (user) => {
  try {
    const { rows } = await db.query("SELECT * FROM tasks WHERE author_id=$1", [
      user.id,
    ]);

    const tasks = rows.map((task) => mapTaskToSnakeCase(task));
    return tasks;
  } catch (error) {
    throw error;
  }
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
  else name = name.trim();

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

    return mapTaskToSnakeCase(rows[0]);
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
      `UPDATE tasks SET 
        task_name=$3,  
        task_description=$4,
        date_to_complete=$5,
        start_time=$6,
        end_time=$7 
          WHERE task_id=$2 AND author_id=$1 RETURNING *;`,
      [
        user.id,
        taskId,
        taskToEdit.name,
        taskToEdit.description,
        taskToEdit.dateToComplete,
        taskToEdit.startTime,
        taskToEdit.endTime,
      ]
    );

    if (rows.length === 0) throw new ApiError(500, "something went wrong");

    return mapTaskToSnakeCase(rows[0]);
  } catch (error) {
    throw error;
  }
};

const remove = async (user, taskId) => {
  if (
    !taskId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      taskId
    )
  )
    throw new ApiError(400, "bad request - invalid id");

  try {
    const { rows } = await db.query(
      "DELETE FROM tasks WHERE task_id=$1 AND author_id=$2 RETURNING *;",
      [taskId, user.id]
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
