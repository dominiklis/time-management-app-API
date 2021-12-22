const ApiError = require("../errors/ApiError");
const validateId = require("../utils/validating/validateId");

const validateUserParams = (req, res, next) => {
  let { userId } = req.params;

  // validate task id
  if (!userId) throw new ApiError(400, "user id is required");
  if (!validateId(userId))
    throw new ApiError(400, "invalid user id - id must be uuid");

  next();
};

module.exports = validateUserParams;
