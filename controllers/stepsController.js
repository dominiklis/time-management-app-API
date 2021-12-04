const { stepsServices } = require("../services");

const createStep = async (req, res, next) => {
  const { stepText } = req.body;
  const { taskId } = req.params;

  console.log({ taskId, stepText });

  // res.status(201).json({ ok: "ok" });

  try {
    const result = await stepsServices.create(req.user, taskId, stepText);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStep,
};
