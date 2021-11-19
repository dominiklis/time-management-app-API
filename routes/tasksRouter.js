const express = require("express");
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  editTask,
  deleteTask,
  getUsersWithAccess,
  giveUserAccess,
  editUserAccess,
  deleteUserAccess,
} = require("../controllers/tasksController");

router.get("/", getTasks);
router.get("/:id", getTaskById);
router.post("/", createTask);
router.put("/:id", editTask);
router.delete("/:id", deleteTask);

router.get("/:taskId/users", getUsersWithAccess);
router.post("/:taskId/users", giveUserAccess);
router.put("/:taskId/users/:userId", editUserAccess);
router.delete("/:taskId/users/:userId", deleteUserAccess);

module.exports = router;
