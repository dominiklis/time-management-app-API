const validator = require("validator");

const validateEmail = (email) => {
  if (!email) return false;
  return validator.isEmail(email);
};

module.exports = validateEmail;
