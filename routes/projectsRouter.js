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

const {
  validateIdInParams,
  validateProjectBody,
  validateSharingRouteBody,
} = require("../middleware");

const validateProjectIdInParams = validateIdInParams("projectId");
const validateUserIdInParams = validateIdInParams("userId");
const validatePostUsersProjectBody = validateSharingRouteBody(true, false);
const validatePutUsersProjectBody = validateSharingRouteBody(false, true);

router.get("/", getProjects);
router.get("/:projectId", validateProjectIdInParams, getProjectById);
router.post("/", validateProjectBody, createProject);
router.put(
  "/:projectId",
  validateProjectIdInParams,
  validateProjectBody,
  editProject
);
router.delete("/:projectId", validateProjectIdInParams, deleteProject);

// users_projects
router.get("/:projectId/users", validateProjectIdInParams, getUsersWithAccess);
router.post(
  "/:projectId/users",
  validateProjectIdInParams,
  validatePostUsersProjectBody,
  giveUserAccess
);
router.put(
  "/:projectId/users/:userId",
  validateProjectIdInParams,
  validateUserIdInParams,
  validatePutUsersProjectBody,
  editUsersAccess
);
router.delete(
  "/:projectId/users/:userId",
  validateProjectIdInParams,
  validateUserIdInParams,
  removeUsersAccess
);

// projects_tasks
router.get("/:projectId/tasks", getAssignedTasks);
router.post("/:projectId/tasks", assignTask);
router.delete("/:projectId/tasks/:taskId", removeAssignedTasks);

module.exports = router;
