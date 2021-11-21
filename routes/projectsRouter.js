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
  getUsersWithAccess,
  giveUserAccess,
  editUsersAccess,
  removeUsersAccess,
} = require("../controllers/usersProjectsController");

router.get("/", getProjects);
router.get("/:id", getProjectById);
router.post("/", createProject);
router.put("/:id", editProject);
router.delete("/:id", deleteProject);

// users_projects
router.get("/:projectId/users", getUsersWithAccess);
router.post("/:projectId/users", giveUserAccess);
router.put("/:projectId/users/:userId", editUsersAccess);
router.delete("/:projectId/users/:userId", removeUsersAccess);

module.exports = router;
