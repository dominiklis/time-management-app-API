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
  const { taskId } = req.params;
  const { stepText, position } = req.body;

  console.log({ taskId, stepText, position });

  try {
    const result = await stepsServices.create(
      req.user,
      taskId,
      stepText,
      position
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const editStep = async (req, res, next) => {
  const { taskId, stepId } = req.params;
  const { stepText, stepCompleted, position } = req.body;

  console.log({ stepText, stepCompleted, position });

  try {
    const result = await stepsServices.edit(
      req.user,
      taskId,
      stepId,
      stepText,
      stepCompleted,
      position
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deleteStep = async (req, res, next) => {
  const { taskId, stepId } = req.params;

  try {
    const result = await stepsServices.remove(req.user, taskId, stepId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getSteps, createStep, editStep, deleteStep };
