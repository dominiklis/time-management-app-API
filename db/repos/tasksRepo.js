class TasksRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
  }

  async listForUser(userId) {
    return this.db.manyOrNone(
      `SELECT 
        users.name AS author_name, 
        users.email AS author_email,
        ts.*,
        q_steps.steps,
        q_users.users,
        projects.project_name
        FROM (
          SELECT 
            tasks.*,
            users_tasks.accessed_at,
            users_tasks.can_share,
            users_tasks.can_change_permissions,
            users_tasks.can_edit,
            users_tasks.can_delete
            FROM users_tasks LEFT JOIN tasks ON users_tasks.task_id=tasks.task_id
              WHERE users_tasks.user_id=$1
          UNION SELECT 
            tasks.*,
            users_projects.accessed_at,
            false can_share,
            false can_change_permissions,
            users_projects.can_edit can_edit,
            users_projects.can_edit can_delete
            FROM users_projects LEFT JOIN tasks ON users_projects.project_id=tasks.project_id
              WHERE users_projects.user_id=$1 AND NOT EXISTS (
                SELECT * FROM users_tasks WHERE users_tasks.user_id=$1 
                  AND users_tasks.task_id=tasks.task_id
              ) AND task_id IS NOT NULL
          ) AS ts 
          LEFT JOIN users ON ts.author_id=users.user_id
          LEFT JOIN projects ON ts.project_id=projects.project_id
          LEFT JOIN (
            SELECT steps.task_id, json_agg(steps.* ORDER BY position ASC) AS steps FROM 
              steps GROUP BY task_id
            ) AS q_steps ON q_steps.task_id=ts.task_id 
          LEFT JOIN (
            SELECT ut.task_id, json_agg(json_build_object(
              'user_id', ut.user_id,
              'user_name', us.name,
              'can_share', ut.can_share, 
              'can_edit', ut.can_edit, 
              'can_change_permissions', ut.can_change_permissions, 
              'can_delete', ut.can_delete)) 
            AS users FROM users_tasks AS ut 
            LEFT JOIN users AS us ON ut.user_id=us.user_id GROUP BY task_id
          ) AS q_users ON q_users.task_id=ts.task_id`,
      [userId]
    );
  }

  async getSingleById(taskId, userId) {
    return this.db.oneOrNone(
      `SELECT
        users.name AS author_name, 
        users.email AS author_email,
        ts.*,
        q_steps.steps,
        q_users.users,
        projects.project_name
        FROM (
          SELECT 
            tasks.*,
            users_tasks.accessed_at,
            users_tasks.can_share,
            users_tasks.can_change_permissions,
            users_tasks.can_edit,
            users_tasks.can_delete
            FROM users_tasks LEFT JOIN tasks ON users_tasks.task_id=tasks.task_id
              WHERE users_tasks.user_id=$1 AND users_tasks.task_id=$2
          UNION SELECT 
            tasks.*,
            users_projects.accessed_at,
            false can_share,
            false can_change_permissions,
            users_projects.can_edit can_edit,
            users_projects.can_edit can_delete
            FROM users_projects LEFT JOIN tasks ON users_projects.project_id=tasks.project_id
              WHERE users_projects.user_id=$1 AND tasks.task_id=$2 AND NOT EXISTS (
                SELECT * FROM users_tasks WHERE users_tasks.user_id=$1 
                  AND users_tasks.task_id=tasks.task_id
              ) AND task_id IS NOT NULL
          ) AS ts 
          LEFT JOIN users ON ts.author_id=users.user_id
          LEFT JOIN projects ON ts.project_id=projects.project_id
          LEFT JOIN (
            SELECT steps.task_id, json_agg(steps.* ORDER BY position ASC) AS steps FROM 
              steps GROUP BY task_id
            ) AS q_steps ON q_steps.task_id=ts.task_id 
          LEFT JOIN (
            SELECT ut.task_id, json_agg(json_build_object (
              'user_id', ut.user_id,
              'user_name', us.name,
              'can_share', ut.can_share, 
              'can_edit', ut.can_edit, 
              'can_change_permissions', ut.can_change_permissions, 
              'can_delete', ut.can_delete)) 
            AS users FROM users_tasks AS ut 
            LEFT JOIN users AS us ON ut.user_id=us.user_id GROUP BY task_id
          ) AS q_users ON q_users.task_id=ts.task_id`,
      [userId, taskId]
    );
  }

  async getByNameOrDescription(userId, searchInput) {
    return this.db.manyOrNone(
      `SELECT 
        users.name AS author_name, 
        users.email AS author_email,
        ts.*,
        q_steps.steps,
        q_users.users,
        projects.project_name
        FROM (
          SELECT 
            tasks.*,
            users_tasks.accessed_at,
            users_tasks.can_share,
            users_tasks.can_change_permissions,
            users_tasks.can_edit,
            users_tasks.can_delete
            FROM users_tasks LEFT JOIN tasks ON users_tasks.task_id=tasks.task_id
              WHERE users_tasks.user_id=$1
          UNION SELECT 
            tasks.*,
            users_projects.accessed_at,
            false can_share,
            false can_change_permissions,
            users_projects.can_edit can_edit,
            users_projects.can_edit can_delete
            FROM users_projects LEFT JOIN tasks ON users_projects.project_id=tasks.project_id
              WHERE users_projects.user_id=$1 AND NOT EXISTS (
                SELECT * FROM users_tasks WHERE users_tasks.user_id=$1 
                  AND users_tasks.task_id=tasks.task_id
              ) AND task_id IS NOT NULL
          ) AS ts 
          LEFT JOIN users ON ts.author_id=users.user_id
          LEFT JOIN projects ON ts.project_id=projects.project_id
          LEFT JOIN (
            SELECT steps.task_id, json_agg(steps.* ORDER BY position ASC) AS steps FROM 
              steps GROUP BY task_id
            ) AS q_steps ON q_steps.task_id=ts.task_id 
          LEFT JOIN (
            SELECT ut.task_id, json_agg(json_build_object(
              'user_id', ut.user_id,
              'user_name', us.name,
              'can_share', ut.can_share, 
              'can_edit', ut.can_edit, 
              'can_change_permissions', ut.can_change_permissions, 
              'can_delete', ut.can_delete)) 
            AS users FROM users_tasks AS ut 
            LEFT JOIN users AS us ON ut.user_id=us.user_id GROUP BY task_id
          ) AS q_users ON q_users.task_id=ts.task_id
            WHERE 
              ts.task_name LIKE '%${searchInput}%' OR
              ts.task_description LIKE '%${searchInput}%' OR
              users.name LIKE '%${searchInput}%'`,

      [userId]
    );
  }

  async add(
    userId,
    taskName,
    taskDescription,
    taskCompleted,
    completedAt,
    dateToComplete,
    startTime,
    endTime,
    projectId
  ) {
    return this.db.oneOrNone(
      `
      INSERT INTO tasks (
        author_id, 
        task_name, 
        task_description, 
        task_completed, 
        completed_at,
        date_to_complete, 
        start_time, 
        end_time, 
        project_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        userId,
        taskName,
        taskDescription,
        taskCompleted,
        completedAt,
        dateToComplete,
        startTime,
        endTime,
        projectId,
      ]
    );
  }

  async edit(
    taskId,
    taskName,
    taskDescription,
    taskCompleted,
    dateToComplete,
    startTime,
    endTime,
    projectId,
    completedAt
  ) {
    return this.db.oneOrNone(
      `UPDATE tasks AS ts SET
        task_name=$2,
        task_description=$3,
        task_completed=$4,
        date_to_complete=$5,
        start_time=$6,
        end_time=$7,
        project_id=$8,
        completed_at=$9
          WHERE task_id=$1 RETURNING *`,
      [
        taskId,
        taskName,
        taskDescription,
        taskCompleted,
        dateToComplete,
        startTime,
        endTime,
        projectId,
        completedAt,
      ]
    );
  }

  async delete(taskId) {
    return this.db.oneOrNone("DELETE FROM tasks WHERE task_id=$1 RETURNING *", [
      taskId,
    ]);
  }
}

module.exports = TasksRepository;
