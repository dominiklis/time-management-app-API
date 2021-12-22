class TasksRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
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

  async listForUser(userId) {
    return this.db.manyOrNone(
      `
      SELECT us.name AS author_name, 
      us.email AS author_email, 
      ts.*, 
      pj.project_name,
      ut.accessed_at,
      ut.can_share,
      ut.can_change_permissions,
      ut.can_edit,
      ut.can_delete, 
      q_steps.steps,
      q_users.users FROM 
        users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id  
          LEFT JOIN users AS us ON ts.author_id=us.user_id
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
            AS users FROM users_tasks AS ut LEFT JOIN users AS us ON ut.user_id=us.user_id GROUP BY task_id
          ) AS q_users ON q_users.task_id=ts.task_id
          LEFT JOIN projects AS pj ON ts.project_id=pj.project_id
        WHERE ut.user_id=$1
  `,
      [userId]
    );
  }

  async getSingleById(taskId, userId) {
    return this.db.oneOrNone(
      `
        SELECT us.name AS author_name, 
        us.email AS author_email, 
        ts.*, 
        pj.project_name,
        ut.accessed_at,
        ut.can_share,
        ut.can_change_permissions,
        ut.can_edit,
        ut.can_delete, 
        q_steps.steps,
        q_users.users FROM 
          users_tasks AS ut LEFT JOIN tasks AS ts ON ut.task_id = ts.task_id  
            LEFT JOIN users AS us ON ts.author_id=us.user_id
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
              AS users FROM users_tasks AS ut LEFT JOIN users AS us ON ut.user_id=us.user_id GROUP BY task_id
            ) AS q_users ON q_users.task_id=ts.task_id
            LEFT JOIN projects AS pj ON ts.project_id=pj.project_id
          WHERE ut.user_id=$2 AND ut.task_id=$1
    `,
      [taskId, userId]
    );
  }

  async delete(taskId) {
    return this.db.oneOrNone("DELETE FROM tasks WHERE task_id=$1 RETURNING *", [
      taskId,
    ]);
  }

  async edit(
    userId,
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
        task_name=$3,
        task_description=$4,
        task_completed=$5,
        date_to_complete=$6,
        start_time=$7,
        end_time=$8,
        project_id=$9,
        completed_at=$10
          FROM users_tasks AS ut
            WHERE ts.task_id = ut.task_id
              AND ut.user_id=$1
              AND ut.can_edit=true
              AND ts.task_id=$2 RETURNING *`,
      [
        userId,
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
}

module.exports = TasksRepository;
