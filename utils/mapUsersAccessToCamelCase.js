const mapUsersAccessToCamelCase = (access) => {
  return {
    taskId: access.task_id,
    projectId: access.project_id,
    name: access.name,
    email: access.email,
    userId: access.user_id,
    accessedAt: access.accessed_at,
    accessLevel: access.access_level,
  };
};

module.exports = mapUsersAccessToCamelCase;
