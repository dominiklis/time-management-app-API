const ApiError = require("../errors/ApiError");

const validateProjectBody = (req, res, next) => {
  let { projectName, projectDescription } = req.body;

  if (!projectName) throw new ApiError(400, "project name is required");
  projectName = projectName.trim();
  if (!projectName) throw new ApiError(400, "project name is required");
  req.body.projectName = projectName;

  if (projectDescription) projectDescription = projectDescription.trim();
  else taskDescription = null;
  req.body.projectDescription = projectDescription;

  next();
};

module.exports = validateProjectBody;
