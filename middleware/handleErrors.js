const handleError = (err, req, res, next) => {
  console.log(err);
  res.status(500);
  return res.status(err.statusCode ?? 500).json({ message: err.message });
};

module.exports = handleError;
