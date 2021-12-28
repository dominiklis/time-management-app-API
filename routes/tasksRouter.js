const express = require("express");
const router = express.Router();

const {
  getTasks,
  getTaskById,
  createTask,
  editTask,
  deleteTask,
} = require("../controllers/tasksController");

const {
  getUsersWithAccess,
  giveUserAccess,
  editUserAccess,
  deleteUserAccess,
} = require("../controllers/usersTasksController");

const {
  getSteps,
  createStep,
  editMultipleSteps,
  editStep,
  deleteStep,
} = require("../controllers/stepsController");

const {
  validateTaskBody,
  validateSharingRouteBody,
  validateIdInParams,
  validateStepBody,
} = require("../middleware");

const validateTaskParams = validateIdInParams("taskId");
const validateUserParams = validateIdInParams("userId");
const validatePostUsersTasksBody = validateSharingRouteBody(true, false);
const validatePutUsersTasksBody = validateSharingRouteBody(false, true);

// tasks
router.get("/", getTasks);
router.get("/:taskId", getTaskById);
router.post("/", validateTaskBody, createTask);
router.put("/:taskId", validateTaskParams, validateTaskBody, editTask);
router.delete("/:taskId", validateTaskParams, deleteTask);

// users_tasks
router.get("/:taskId/users", validateTaskParams, getUsersWithAccess);
router.post(
  "/:taskId/users",
  validateTaskParams,
  validatePostUsersTasksBody,
  giveUserAccess
);
router.put(
  "/:taskId/users/:userId",
  validateTaskParams,
  validatePutUsersTasksBody,
  editUserAccess
);
router.delete(
  "/:taskId/users/:userId",
  validateTaskParams,
  validateUserParams,
  deleteUserAccess
);

const validateStepParams = validateIdInParams("stepId");

// steps
router.get("/:taskId/steps", validateTaskParams, getSteps);
router.post("/:taskId/steps", validateTaskParams, validateStepBody, createStep);
router.put("/:taskId/steps/multiple", validateTaskParams, editMultipleSteps);
router.put(
  "/:taskId/steps/:stepId",
  validateTaskParams,
  validateStepParams,
  validateStepBody,
  editStep
);
router.delete(
  "/:taskId/steps/:stepId",
  validateTaskParams,
  validateStepParams,
  deleteStep
);

module.exports = router;
