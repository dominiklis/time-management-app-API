const mapTaskToCamelCase = (task) => {
  return {
    taskId: task.task_id,
    authorId: task.author_id,
    authorName: task.name,
    authorEmail: task.email,
    name: task.task_name,
    description: task.task_description,
    completed: task.task_completed,
    createdAt: task.created_at,
    completedAt: task.completed_at,
    dateToComplete: task?.date_to_complete,
    startTime: task.start_time,
    endTime: task.end_time,
    accessedAt: task.accessed_at,
    accessLevel: task.access_level,
  };
};

module.exports = mapTaskToCamelCase;
