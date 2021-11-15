const express = require("express");
const router = express.Router();
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

module.exports = router;
