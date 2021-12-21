const express = require("express");
const router = express.Router();
const { auth } = require("../middleware");

const usersRouter = require("./usersRoutes");
const tasksRouter = require("./tasksRouter");
const projectsRouter = require("./projectsRouter");

router.use("/users", usersRouter);
router.use("/tasks", auth, tasksRouter);
router.use("/projects", auth, projectsRouter);

module.exports = router;
