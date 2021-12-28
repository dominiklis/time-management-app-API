class usersProjectsRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
  }

  async listForProject(projectId) {
    return this.db.manyOrNone(
      `SELECT up.project_id, us.name, us.email, us.user_id, up.* FROM users_projects AS up 
        LEFT JOIN users AS us ON up.user_id = us.user_id
          WHERE project_id=$1`,
      [projectId]
    );
  }

  async listForUser(userId) {
    return this.db.manyOrNone(
      `SELECT up.project_id, us.name, us.email, us.user_id, up.* FROM users_projects AS up 
        LEFT JOIN users AS us ON up.user_id = us.user_id
          WHERE user_id=$1`,
      [userId]
    );
  }

  async getSingle(userId, projectId) {
    return this.db.oneOrNone(
      `SELECT * FROM users_projects WHERE user_id=$1 AND project_id=$2`,
      [userId, projectId]
    );
  }

  async add(
    userId,
    projectId,
    canShare,
    canChangePermissions,
    canEdit,
    canDelete
  ) {
    return this.db.oneOrNone(
      `INSERT INTO users_projects (
        user_id, project_id, can_share, can_change_permissions, can_edit, can_delete) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, projectId, canShare, canChangePermissions, canEdit, canDelete]
    );
  }

  async edit(
    userId,
    projectId,
    canShare,
    canChangePermissions,
    canEdit,
    canDelete
  ) {
    return this.db.oneOrNone(
      `UPDATE users_projects SET 
        can_share=$3, 
        can_change_permissions=$4, 
        can_edit=$5, 
        can_delete=$6 
          WHERE project_id=$2 AND user_id=$1 RETURNING *`,
      [userId, projectId, canShare, canChangePermissions, canEdit, canDelete]
    );
  }

  async delete(projectId, userId) {
    return this.db.oneOrNone(
      `DELETE FROM users_projects WHERE project_id=$1 AND user_id=$2 RETURNING *`,
      [projectId, userId]
    );
  }
}

module.exports = usersProjectsRepository;
