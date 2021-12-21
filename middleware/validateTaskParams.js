const ApiError = require("../errors/ApiError");
const validateId = require("../utils/validating/validateId");

const validateTaskParams = (req, res, next) => {
  let { taskId } = req.params;

  // validate task id
  if (!taskId) throw new ApiError(400, "task id is required");
  if (!validateId(taskId))
    throw new ApiError(400, "invalid task id - id must be uuid");

  next();
};

module.exports = validateTaskParams;
