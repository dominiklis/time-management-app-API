const auth = require("./authMidlleware");
const handleErrors = require("./handleErrors");
const validateTaskBody = require("./validateTaskBody");
const validateTaskParams = require("./validateTaskParams");
const validateUserRequestBody = require("./validateUserRequestBody");

module.exports = {
  auth,
  handleErrors,
  validateTaskBody,
  validateTaskParams,
  validateUserRequestBody,
};
