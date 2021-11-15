const express = require("express");
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  editTask,
} = require("../controllers/tasksController");

router.get("/", getTasks);
router.get("/:id", getTaskById);
router.post("/", createTask);
router.put("/:id", editTask);

module.exports = router;
