const validator = require("validator");

const validatePassword = (password) =>
  validator.isStrongPassword(password, { minLength: 6 });

module.exports = validatePassword;
