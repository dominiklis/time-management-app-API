const express = require("express");
const router = express.Router();
const { getTaskById, createTask } = require("../controllers/tasksController");

router.get("/:id", getTaskById);
router.post("/", createTask);

module.exports = router;
