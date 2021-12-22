class UsersTasksRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
  }

  async add(
    userId,
    taskId,
    canShare,
    canCahngePermissions,
    canEdit,
    canDelete
  ) {
    return this.db.oneOrNone(
      `INSERT INTO users_tasks (
        user_id, task_id, can_share, can_change_permissions, can_edit, can_delete
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, taskId, canShare, canCahngePermissions, canEdit, canDelete]
    );
  }

  async getSingle(userId, taskId) {
    return this.db.oneOrNone(
      "SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2",
      [userId, taskId]
    );
  }

  async listForTask(taskId) {
    return this.db.manyOrNone(
      `SELECT ut.task_id, us.name, us.email, us.user_id, ut.* FROM users_tasks AS ut 
        LEFT JOIN users AS us ON ut.user_id = us.user_id
          WHERE task_id=$1`,
      [taskId]
    );
  }

  async edit(
    userId,
    taskId,
    canShare,
    canChangePermissions,
    canEdit,
    canDelete
  ) {
    return this.db.oneOrNone(
      `UPDATE users_tasks SET can_share=$1, can_change_permissions=$2, can_edit=$3, can_delete=$4 
          WHERE task_id=$5 AND user_id=$6 RETURNING *`,
      [canShare, canChangePermissions, canEdit, canDelete, taskId, userId]
    );
  }

  async delete(taskId, userId) {
    return this.db.oneOrNone(
      `DELETE FROM users_tasks WHERE task_id=$1 AND user_id=$2 RETURNING *`,
      [taskId, userId]
    );
  }
}

module.exports = UsersTasksRepository;
