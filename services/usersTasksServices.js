const db = require("../db");
const ApiError = require("../errors/ApiError");
const { accessLevels } = require("../constants");
const checkIfIdIsValid = require("../utils/checkIfIdIsValid");
const validator = require("validator");
const mapUsersAccessToCamelCase = require("../utils/mapUsersAccessToCamelCase");

const getUsers = async (user, taskId) => {
  if (!taskId || !checkIfIdIsValid(taskId))
    throw new ApiError(400, "bad request - invalid id");

  try {
    const { rows } = await db.query(
      `SELECT ut.task_id, us.name, us.email, us.user_id, ut.accessed_at, ut.access_level FROM users_tasks AS ut 
        LEFT JOIN users AS us ON ut.user_id = us.user_id
          WHERE task_id=$1`,
      [taskId]
    );

    if (!rows.some((ut) => ut.user_id === user.id))
      throw new ApiError(400, "bad request");

    const usersTasks = rows.map((userTask) =>
      mapUsersAccessToCamelCase(userTask)
    );
    return usersTasks;
  } catch (error) {
    throw error;
  }
};

const create = async (
  user,
  taskId,
  userId,
  userName,
  userEmail,
  accessLevel = accessLevels.view
) => {
  if (!userId && !userEmail && !userName)
    throw new ApiError(400, "bad request");

  if (!taskId || !checkIfIdIsValid(taskId))
    throw new ApiError(400, "bad request - invalid task id");

  if (userId && !checkIfIdIsValid(userId))
    throw new ApiError(400, "bad request - invalid user id");

  if (userEmail && !validator.isEmail(userEmail))
    throw new ApiError(400, "bad request");

  try {
    const { rows } = await db.query(
      `SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2;`,
      [user.id, taskId]
    );

    if (rows.length === 0 || rows[0].access_level === accessLevels.view)
      throw new ApiError(400, "bad request");

    if (!userId) {
      let userIdFound = false;

      if (userEmail) {
        const { rows: emailRows } = await db.query(
          "SELECT user_id FROM users WHERE email=$1",
          [userEmail]
        );

        if (emailRows.length !== 0) {
          userId = emailRows[0].user_id;
          userIdFound = true;
        }
      } else {
        const { rows: nameRows } = await db.query(
          "SELECT user_id FROM users WHERE name=$1",
          [userName]
        );

        if (nameRows.length !== 0) {
          userId = nameRows[0].user_id;
          userIdFound = true;
        }
      }

      if (!userIdFound) throw new ApiError(400, "bad request");
    }

    const { rows: createdUTRows } = await db.query(
      `INSERT INTO users_tasks(user_id, task_id, access_level) VALUES ($1, $2, $3) RETURNING *`,
      [userId, taskId, accessLevel]
    );

    if (createdUTRows.length === 0)
      throw new ApiError(500, "something went wrong");

    return mapUsersAccessToCamelCase(createdUTRows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      throw new ApiError(
        400,
        "bad request - user arleady has access to this task"
      );
    }

    if (error?.code === "23514") {
      throw new ApiError(
        400,
        `bad request - invalid access level (valid are '${accessLevels.view}', '${accessLevels.edit}' or '${accessLevels.delete}')`
      );
    }
    throw error;
  }
};

const edit = async (user, taskId, userId, userName, userEmail, accessLevel) => {
  if (!accessLevel) throw new ApiError(400, "bad request");

  if (!userId && !userEmail && !userName)
    throw new ApiError(400, "bad request");

  if (!taskId || !checkIfIdIsValid(taskId))
    throw new ApiError(400, "bad request - invalid task id");

  if (!userId || !checkIfIdIsValid(userId))
    throw new ApiError(400, "bad request - invalid user id");

  if (userEmail && !validator.isEmail(userEmail))
    throw new ApiError(400, "bad request");

  try {
    const { rows } = await db.query(
      `SELECT ut.*, ts.author_id FROM users_tasks AS ut
        LEFT JOIN tasks AS ts ON ut.task_id=ts.task_id 
          WHERE ut.user_id=$1 AND ut.task_id=$2;`,
      [user.id, taskId]
    );

    if (rows.length === 0 || rows[0].access_level === accessLevels.view)
      throw new ApiError(400, "bad request");

    if (
      rows[0].access_level === accessLevels.edit &&
      accessLevel === accessLevels.delete
    )
      throw new ApiError(400, "bad request");

    if (!userId) {
      let userIdFound = false;

      if (userEmail) {
        const { rows: emailRows } = await db.query(
          "SELECT user_id FROM users WHERE email=$1",
          [userEmail]
        );

        if (emailRows.length !== 0) {
          userId = emailRows[0].user_id;
          userIdFound = true;
        }
      } else {
        const { rows: nameRows } = await db.query(
          "SELECT user_id FROM users WHERE name=$1",
          [userName]
        );

        if (nameRows.length !== 0) {
          userId = nameRows[0].user_id;
          userIdFound = true;
        }
      }

      if (!userIdFound) throw new ApiError(400, "bad request");
    }

    if (userId === rows[0].author_id) throw new ApiError(400, "bad request");

    const { rows: editedUTRows } = await db.query(
      `UPDATE users_tasks SET access_level=$1 WHERE task_id=$2 AND user_id=$3 RETURNING *;`,
      [accessLevel, taskId, userId]
    );

    if (editedUTRows.length === 0)
      throw new ApiError(500, "something went wrong");

    return mapUsersAccessToCamelCase(editedUTRows[0]);
  } catch (error) {
    if (error?.code === "23514") {
      throw new ApiError(
        400,
        "invalid access level (valid are 'view', 'view, edit' or 'view, edit, delete')"
      );
    }
    throw error;
  }
};

const remove = async (user, taskId, userId) => {
  if (!taskId || !checkIfIdIsValid(taskId))
    throw new ApiError(400, "bad request - invalid task id");

  if (!userId || !checkIfIdIsValid(userId))
    throw new ApiError(400, "bad request - invalid user id");

  try {
    const { rows } = await db.query(
      `SELECT ut.*, ts.author_id FROM users_tasks AS ut
        LEFT JOIN tasks AS ts ON ut.task_id=ts.task_id 
          WHERE ut.user_id=$1 AND ut.task_id=$2;`,
      [user.id, taskId]
    );

    if (userId === rows[0].author_id) throw new ApiError(400, "bad request");

    if (rows.length === 0 || rows[0].access_level !== accessLevels.delete)
      throw new ApiError(400, "bad request");

    const { rows: removedUTRows } = await db.query(
      `DELETE FROM users_tasks WHERE task_id=$1 AND user_id=$2 RETURNING *;`,
      [taskId, userId]
    );

    return mapUsersAccessToCamelCase(removedUTRows[0]);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getUsers,
  create,
  edit,
  remove,
};
