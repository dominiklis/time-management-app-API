const { accessLevels } = require("../constants");
const db = require("../db");
const ApiError = require("../errors/ApiError");
const checkIfIdIsValid = require("../utils/checkIfIdIsValid");

const mapProjectToSnakeCase = (project) => {
  return {
    id: project.project_id,
    authorId: project.author_id,
    authorName: project.name,
    authorEmail: project.email,
    name: project.project_name,
    description: project.project_description,
    createdAt: project.created_at,
    accessedAt: project.accessed_at,
    accessLevel: project.access_level,
  };
};

const get = async (user) => {
  try {
    const { rows } = await db.query(
      `SELECT us.name, us.email, ps.*, up.accessed_at, up.access_level FROM 
        users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
          LEFT JOIN users AS us ON ps.author_id=us.user_id
            WHERE up.user_id=$1;`,
      [user.id]
    );

    const projects = rows.map((project) => mapProjectToSnakeCase(project));
    return projects;
  } catch (error) {
    throw error;
  }
};

const getById = async (user, projectId) => {
  if (!projectId || !checkIfIdIsValid(projectId))
    throw new ApiError(400, "bad request - invalid id");

  try {
    const { rows } = await db.query(
      `SELECT us.name, us.email, ps.*, up.accessed_at, up.access_level FROM 
        users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
          LEFT JOIN users AS us ON ps.author_id=us.user_id
            WHERE up.user_id=$1 AND ps.project_id=$2;`,
      [user.id, projectId]
    );

    if (rows.length === 0) throw new ApiError(400, "bad request");

    return mapProjectToSnakeCase(rows[0]);
  } catch (error) {
    throw error;
  }
};

const create = async (user, name, description) => {
  if (!name) throw new ApiError(400, "name for task is required");
  else name = name.trim();

  const columns = ["author_id", "project_name"];
  const values = ["$1", "$2"];
  const params = [user.id, name];

  try {
    if (description) {
      description = description.trim();
      columns.push("project_description");
      values.push(`$${values.length + 1}`);
      params.push(description);
    }

    let query = `INSERT INTO projects (${columns.join(
      ", "
    )}) VALUES (${values.join(", ")}) RETURNING *`;

    const { rows } = await db.query(query, params);

    if (rows[0].length === 0) throw new ApiError(500, "something went wrong");

    const { rows: usersProjectsRows } = await db.query(
      `INSERT INTO users_projects (user_id, project_id, access_level) VALUES ($1, $2, $3) RETURNING *`,
      [user.id, rows[0].project_id, accessLevels.delete]
    );

    if (usersProjectsRows.length === 0) {
      await db.query("DELETE FROM projects WHERE project_id=$1", [
        rows[0].project_id,
      ]);
      throw new ApiError(500, "something went wrong");
    }

    return mapProjectToSnakeCase({
      ...rows[0],
      accessed_at: usersProjectsRows[0].accessed_at,
      access_level: usersProjectsRows[0].access_level,
    });
  } catch (error) {
    throw error;
  }
};

const edit = async (user, projectId, name, description) => {
  if (name) name = name.trim();
  if (description) description = description.trim();

  if (!projectId || checkIfIdIsValid(projectId))
    throw new ApiError(400, "bad request");

  if (!name && !description) return;

  try {
    const projectToEdit = await getById(user, projectId);

    if (name) projectToEdit.name = name;

    if (description) projectToEdit.description = description;

    const { rows } = await db.query(
      `UPDATE projects AS ps SET 
        project_name=$5,  
        project_description=$6
          FROM users_projects AS up 
            WHERE ps.project_id = up.project_id 
              AND up.user_id=$1
              AND (up.access_level=$2 OR up.access_level=$3) 
              AND ps.project_id=$4 RETURNING *`,
      [
        user.id,
        accessLevels.edit,
        accessLevels.delete,
        projectId,
        projectToEdit.name,
        projectToEdit.description,
      ]
    );

    if (rows.length === 0) throw new ApiError(400, "bad request");

    return mapProjectToSnakeCase(rows[0]);
  } catch (error) {
    throw error;
  }
};

const remove = async (user, projectId) => {
  if (!projectId || !checkIfIdIsValid(projectId))
    throw new ApiError(400, "bad request - invalid id");

  try {
    const { rows: usersProjectsRows } = await db.query(
      `SELECT * FROM users_projects WHERE user_id=$1 AND project_id=$2`,
      [user.id, projectId]
    );

    if (
      usersProjectsRows.length === 0 ||
      usersProjectsRows[0].access_level !== accessLevels.delete
    )
      throw new ApiError(400, "bad request");

    const { rows: deletedProjectRows } = await db.query(
      "DELETE FROM projects WHERE project_id=$1 RETURNING *;",
      [projectId]
    );

    if (deletedProjectRows.length === 0) throw new ApiError(400, "bad request");

    return mapProjectToSnakeCase(deletedProjectRows[0]);
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
