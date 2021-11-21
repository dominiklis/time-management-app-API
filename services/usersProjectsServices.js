const db = require("../db");
const ApiError = require("../errors/ApiError");
const { accessLevels } = require("../constants");
const checkIfIdIsValid = require("../utils/checkIfIdIsValid");
const mapUsersAccessToCamelCase = require("../utils/mapUsersAccessToCamelCase");
const validator = require("validator");

const getUsers = async (user, projectId) => {
  if (!projectId || !checkIfIdIsValid(projectId))
    throw new ApiError(400, "bad request - invalid id");

  try {
    const { rows } = await db.query(
      `SELECT up.project_id, us.name, us.email, us.user_id, up.accessed_at, up.access_level FROM users_projects AS up 
        LEFT JOIN users AS us ON up.user_id = us.user_id
          WHERE project_id=$1`,
      [projectId]
    );

    if (!rows.some((up) => up.user_id === user.id))
      throw new ApiError(400, "bad request");

    const usersProjects = rows.map((u) => mapUsersAccessToCamelCase(u));
    return usersProjects;
  } catch (error) {
    throw error;
  }
};

const create = async (
  user,
  projectId,
  userId,
  userName,
  userEmail,
  accessLevel = accessLevels.view
) => {
  if (!userId && !userEmail && !userName)
    throw new ApiError(400, "bad request");

  if (!projectId || !checkIfIdIsValid(projectId))
    throw new ApiError(400, "bad request - invalid project id");

  if (userId && !checkIfIdIsValid(userId))
    throw new ApiError(400, "bad request - invalid user id");

  if (userEmail && !validator.isEmail(userEmail))
    throw new ApiError(400, "bad request");

  try {
    const { rows } = await db.query(
      `SELECT * FROM users_projects WHERE user_id=$1 AND project_id=$2;`,
      [user.id, projectId]
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

    const { rows: createdUPRows } = await db.query(
      `INSERT INTO users_projects (user_id, project_id, access_level) VALUES ($1, $2, $3) RETURNING *`,
      [userId, projectId, accessLevel]
    );

    if (createdUPRows.length === 0)
      throw new ApiError(500, "something went wrong");

    return mapUsersAccessToCamelCase(createdUPRows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      throw new ApiError(
        400,
        "bad request - user arleady has access to this project"
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

const edit = async (user, projectId, userId, accessLevel) => {
  if (!accessLevel) throw new ApiError(400, "bad request");

  if (!projectId || !checkIfIdIsValid(projectId))
    throw new ApiError(400, "bad request - invalid task id");

  if (!userId || !checkIfIdIsValid(userId))
    throw new ApiError(400, "bad request - invalid user id");

  try {
    const { rows } = await db.query(
      `SELECT up.*, ps.author_id FROM users_projects AS up
        LEFT JOIN projects AS ps ON up.project_id=ps.project_id 
          WHERE up.user_id=$1 AND up.project_id=$2;`,
      [user.id, projectId]
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
      `UPDATE users_projects SET access_level=$1 WHERE project_id=$2 AND user_id=$3 RETURNING *;`,
      [accessLevel, projectId, userId]
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

const remove = async (user, projectId, userId) => {
  if (!projectId || !checkIfIdIsValid(projectId))
    throw new ApiError(400, "bad request - invalid task id");

  if (!userId || !checkIfIdIsValid(userId))
    throw new ApiError(400, "bad request - invalid user id");

  try {
    const { rows } = await db.query(
      `SELECT up.*, ps.author_id FROM users_projects AS up
        LEFT JOIN projects AS ps ON up.project_id=ps.project_id 
          WHERE up.user_id=$1 AND up.project_id=$2;`,
      [user.id, projectId]
    );

    if (userId === rows[0].author_id) throw new ApiError(400, "bad request");

    if (rows.length === 0 || rows[0].access_level !== accessLevels.delete)
      throw new ApiError(400, "bad request");

    const { rows: removedUTRows } = await db.query(
      `DELETE FROM users_projects WHERE project_id=$1 AND user_id=$2 RETURNING *;`,
      [projectId, userId]
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
