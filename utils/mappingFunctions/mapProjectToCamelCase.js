const mapProjectToCamelCase = (project) => {
  return {
    projectId: project.project_id,
    authorId: project.author_id,
    authorName: project.name,
    authorEmail: project.email,
    name: project.project_name,
    description: project.project_description,
    createdAt: project.created_at,
    completedAt: project.completed_at,
    accessedAt: project.accessed_at,
    accessLevel: project.access_level,
  };
};

module.exports = mapProjectToCamelCase;
