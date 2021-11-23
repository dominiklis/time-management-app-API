const mapProjectsTasksToCameCase = (pt) => {
  return {
    projectId: pt.project_id,
    taskId: pt.task_id,
    assignedAt: pt.assigned_at,
    assignedBy: pt.assigned_by,
    assignerName: pt.assigner_name,
    taskName: pt.task_name,
  };
};

module.exports = mapProjectsTasksToCameCase;
