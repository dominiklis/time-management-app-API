const express = require("express");
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  editProject,
  deleteProject,
} = require("../controllers/projectsController");

const {
  getAssignedTasks,
  assignTask,
  removeAssignedTasks,
} = require("../controllers/projectsTasksController");

const {
  getUsersWithAccess,
  giveUserAccess,
  editUsersAccess,
  removeUsersAccess,
} = require("../controllers/usersProjectsController");

const { validateIdInParams, validateProjectBody } = require("../middleware");
const validateProjectParams = validateIdInParams("projectId");

router.get("/", getProjects);
router.get("/:projectId", validateProjectParams, getProjectById);
router.post("/", validateProjectBody, createProject);
router.put(
  "/:projectId",
  validateProjectParams,
  validateProjectBody,
  editProject
);
router.delete("/:projectId", validateProjectParams, deleteProject);

// users_projects
router.get("/:projectId/users", getUsersWithAccess);
router.post("/:projectId/users", giveUserAccess);
router.put("/:projectId/users/:userId", editUsersAccess);
router.delete("/:projectId/users/:userId", removeUsersAccess);

// projects_tasks
router.get("/:projectId/tasks", getAssignedTasks);
router.post("/:projectId/tasks", assignTask);
router.delete("/:projectId/tasks/:taskId", removeAssignedTasks);

module.exports = router;
