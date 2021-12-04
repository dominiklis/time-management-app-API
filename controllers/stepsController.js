const { stepsServices } = require("../services");

const getSteps = async (req, res, next) => {
  const { taskId } = req.params;

  try {
    const result = await stepsServices.get(req.user, taskId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createStep = async (req, res, next) => {
  const { stepText } = req.body;
  const { taskId } = req.params;

  try {
    const result = await stepsServices.create(req.user, taskId, stepText);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getSteps, createStep };
