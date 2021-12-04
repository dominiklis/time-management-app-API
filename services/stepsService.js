const db = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const create = async (user, taskId, stepText) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  if (!stepText) throw new ApiError(400, errorTexts.common.badRequest);
  stepText = stepText.trim();
  if (!stepText) throw new ApiError(400, errorTexts.common.badRequest);

  try {
    const result = await db.task(async (t) => {
      const userTask = await t.oneOrNone(
        "SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2",
        [user.id, taskId]
      );

      if (!userTask || !userTask.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const createdStep = await t.oneOrNone(
        "INSERT INTO steps (task_id, step_text) VALUES ($1, $2) RETURNING *",
        [taskId, stepText]
      );

      if (!createdStep)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return createdStep;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  create,
};
