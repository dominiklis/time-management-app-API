const auth = require("./authMidlleware");
const handleErrors = require("./handleErrors");
const validateIdInParams = require("./validateIdInParams");
const validateTaskBody = require("./validateTaskBody");
const validateTaskParams = require("./validateTaskParams");
const validateUserRequestBody = require("./validateUserRequestBody");
const validateUserParams = require("./validateUserParams");
const validateUsersTasksBody = require("./validateUsersTasksBody");
const validateProjectBody = require("./validateProjectBody");

module.exports = {
  auth,
  handleErrors,
  validateIdInParams,
  validateTaskBody,
  validateTaskParams,
  validateUserRequestBody,
  validateUserParams,
  validateUsersTasksBody,
  validateProjectBody,
};
