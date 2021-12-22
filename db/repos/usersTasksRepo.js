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
}

module.exports = UsersTasksRepository;
