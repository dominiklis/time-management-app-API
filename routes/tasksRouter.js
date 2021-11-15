const express = require("express");
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
} = require("../controllers/tasksController");

router.get("/", getTasks);
router.get("/:id", getTaskById);
router.post("/", createTask);

module.exports = router;
