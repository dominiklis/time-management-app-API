const validateDateString = (dateString) => {
  if (
    !/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/.test(
      dateString
    )
  )
    return false;

  return true;
};

module.exports = validateDateString;
