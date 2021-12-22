const ApiError = require("../errors/ApiError");
const validateId = require("../utils/validating/validateId");

const validateIdInParams = (propertyName) => (req, res, next) => {
  const id = req.params[propertyName];

  // validate task name
  if (!id) throw new ApiError(400, `${propertyName} is required`);
  if (!validateId(id))
    throw new ApiError(400, `invalid ${propertyName} - id must be uuid`);

  next();
};

module.exports = validateIdInParams;
