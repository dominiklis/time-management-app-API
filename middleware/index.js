const auth = require("./authMidlleware");
const handleErrors = require("./handleErrors");
const validateIdInParams = require("./validateIdInParams");
const validateTaskBody = require("./validateTaskBody");
const validateUserRequestBody = require("./validateUserRequestBody");
const validateSharingRouteBody = require("./validateSharingRouteBody");
const validateProjectBody = require("./validateProjectBody");

module.exports = {
  auth,
  handleErrors,
  validateIdInParams,
  validateTaskBody,
  validateUserRequestBody,
  validateSharingRouteBody,
  validateProjectBody,
};
