class ProjectsRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
  }

  async listForUser(userId) {
    return this.db.manyOrNone(
      `
      SELECT us.name AS author_name, 
        us.email AS author_email, 
        ps.*, 
        up.can_share, 
        up.can_change_permissions, 
        up.can_edit, 
        up.can_delete,
        q_users.users FROM 
          users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
            LEFT JOIN users AS us ON ps.author_id=us.user_id
            LEFT JOIN (
              SELECT up.project_id, json_agg(json_build_object (
                'user_id', up.user_id,
                'user_name', us.name,
                'can_share', up.can_share, 
                'can_edit', up.can_edit, 
                'can_change_permissions', up.can_change_permissions, 
                'can_delete', up.can_delete)) 
              AS users FROM users_projects AS up 
              LEFT JOIN users AS us ON up.user_id=us.user_id GROUP BY project_id
            ) AS q_users ON q_users.project_id=ps.project_id
      WHERE up.user_id=$1
      `,
      [userId]
    );
  }

  async getSingleById(userId, projectId) {
    return this.db.oneOrNone(
      `
      SELECT us.name AS author_name, 
        us.email AS author_email, 
        ps.*, 
        up.can_share, 
        up.can_change_permissions, 
        up.can_edit, 
        up.can_delete,
        q_users.users FROM 
          users_projects AS up LEFT JOIN projects AS ps ON up.project_id = ps.project_id
            LEFT JOIN users AS us ON ps.author_id=us.user_id
            LEFT JOIN (
              SELECT up.project_id, json_agg(json_build_object (
                'user_id', up.user_id,
                'user_name', us.name,
                'can_share', up.can_share, 
                'can_edit', up.can_edit, 
                'can_change_permissions', up.can_change_permissions, 
                'can_delete', up.can_delete)) 
              AS users FROM users_projects AS up 
            LEFT JOIN users AS us ON up.user_id=us.user_id GROUP BY project_id
          ) AS q_users ON q_users.project_id=ps.project_id
        WHERE up.user_id=$1 AND ps.project_id=$2`,
      [userId, projectId]
    );
  }

  async add(userId, name, description) {
    return this.db.oneOrNone(
      `INSERT INTO projects (author_id, project_name, project_description) VALUES ($1, $2, $3) RETURNING *`,
      [userId, name, description]
    );
  }

  async edit(projectId, name, description) {
    return this.db.oneOrNone(
      `UPDATE projects AS ps SET
        project_name=$2,
        project_description=$3
          WHERE project_id=$1 RETURNING *`,
      [projectId, name, description]
    );
  }

  async delete(projectId) {
    return this.db.oneOrNone(
      `DELETE FROM projects WHERE project_id=$1 RETURNING *`,
      [projectId]
    );
  }
}

module.exports = ProjectsRepository;
