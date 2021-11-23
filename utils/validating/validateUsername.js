const validateUsername = (username) => {
  if (!username) return false;
  if (username.length < 3) return false;

  return true;
};

module.exports = validateUsername;
