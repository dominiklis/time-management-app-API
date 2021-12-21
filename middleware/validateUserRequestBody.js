const ApiError = require("../errors/ApiError");
const {
  validateUsername,
  validateEmail,
  validatePassword,
} = require("../utils");
const { errorTexts } = require("../utils/constants");

const validateUserRequestBody =
  (optionalFields = false) =>
  (req, res, next) => {
    let { name, email, password } = req.body;

    // validate name
    if (!optionalFields && !name)
      throw new ApiError(400, errorTexts.users.invalidName);
    if (name) {
      name = name.trim();
      if (!validateUsername(name)) {
        throw new ApiError(400, errorTexts.users.invalidName);
      }
      req.body.name = name;
    }

    // validate email
    if (!optionalFields && !email) {
      throw new ApiError(400, errorTexts.users.invalidEmail);
    }
    if (email && !validateEmail(email))
      throw new ApiError(400, errorTexts.users.invalidEmail);

    // validate password
    if (!validatePassword(password))
      throw new ApiError(400, errorTexts.users.invalidPassword);

    next();
  };

module.exports = validateUserRequestBody;
