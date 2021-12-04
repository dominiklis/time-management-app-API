const express = require("express");
const router = express.Router();

// tasks
const {
  getTasks,
  getTaskById,
  createTask,
  editTask,
  deleteTask,
} = require("../controllers/tasksController");

router.get("/", getTasks);
router.get("/:id", getTaskById);
router.post("/", createTask);
router.put("/:id", editTask);
router.delete("/:id", deleteTask);

// users_tasks
const {
  getUsersWithAccess,
  giveUserAccess,
  editUserAccess,
  deleteUserAccess,
} = require("../controllers/usersTasksController");

router.get("/:taskId/users", getUsersWithAccess);
router.post("/:taskId/users", giveUserAccess);
router.put("/:taskId/users/:userId", editUserAccess);
router.delete("/:taskId/users/:userId", deleteUserAccess);

// steps
const {
  getSteps,
  createStep,
  editStep,
} = require("../controllers/stepsController");

router.get("/:taskId/steps", getSteps);
router.post("/:taskId/steps", createStep);
router.post("/:taskId/steps/:stepId", editStep);

module.exports = router;
