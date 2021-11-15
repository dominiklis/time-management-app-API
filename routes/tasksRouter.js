const express = require("express");
const router = express.Router();
const { createTask } = require("../controllers/tasksController");

router.post("/", createTask);

module.exports = router;
