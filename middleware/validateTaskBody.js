const ApiError = require("../errors/ApiError");
const { validateId, validateDateString } = require("../utils");

const validateTaskBody = (req, res, next) => {
  let {
    taskName,
    taskDescription,
    taskCompleted,
    startDate,
    endDate,
    startTime,
    endTime,
    projectId,
    priority,
  } = req.body;

  // validate task name
  if (!taskName) throw new ApiError(400, "task name cannot be empty");
  taskName = taskName.trim();
  if (!taskName) throw new ApiError(400, "task name cannot be empty");
  req.body.taskName = taskName;

  // validate task description
  if (taskDescription) taskDescription = taskDescription.trim();
  else taskDescription = null;
  req.body.taskDescription = taskDescription;

  // validate task taskCompleted
  if (typeof taskCompleted !== "boolean")
    throw new ApiError(400, "invalid taskCompleted field - only booleans");

  // validate startDate
  if (!startDate) req.body.startDate = null;
  else if (!validateDateString(startDate))
    throw new ApiError(
      400,
      "invalid date format in field startDate, use ISO string"
    );

  // validate endDate
  if (!endDate) req.body.endDate = null;
  else if (!validateDateString(endDate))
    throw new ApiError(
      400,
      "invalid date format in field endDate, use ISO string"
    );

  // validate startTime
  if (typeof startTime !== "boolean") req.body.startTime = false;

  // validate endTime
  if (typeof endTime !== "boolean") req.body.endTime = false;

  // validate project id
  if (!projectId) req.body.projectId = null;
  else if (!validateId(projectId))
    throw new ApiError(400, "invalid project id - id must be uuid");

  // validate priority
  if (!priority) req.body.priority = 0;
  else {
    const p = parseInt(priority);
    if (isNaN(p))
      throw new ApiError(400, "invalid project id - id must be uuid");

    if (p < 0) req.body.priority = 0;
    if (p > 2) req.body.priority = 2;
  }

  next();
};

module.exports = validateTaskBody;
