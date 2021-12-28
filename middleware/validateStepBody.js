const ApiError = require("../errors/ApiError");

const validateStepBody = (req, res, next) => {
  let { stepText, position, stepCompleted } = req.body;

  // validate step text
  if (!stepText) throw new ApiError(400, "step text cannot be empty");
  stepText = stepText.trim();
  if (!stepText) throw new ApiError(400, "step text cannot be empty");
  req.body.stepText = stepText;

  // validate step position
  const parsedPosition = parseInt(position);
  if (typeof parsedPosition !== "number" || isNaN(parsedPosition))
    throw new ApiError(
      400,
      "step must have position and it has to be a number"
    );

  console.log(stepCompleted, typeof stepCompleted);

  // validate step completed
  if (typeof stepCompleted !== "boolean")
    throw new ApiError(400, "invalid stepCompleted field - only booleans");

  next();
};

module.exports = validateStepBody;
