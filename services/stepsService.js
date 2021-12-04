const db = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const get = async (user, taskId) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  try {
    const result = await db.manyOrNone(
      `
      SELECT st.* FROM steps AS st LEFT JOIN users_tasks AS ut ON st.task_id=ut.task_id
        WHERE st.task_id=$1 AND user_id=$2;
    `,
      [taskId, user.id]
    );

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

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

const edit = async (user, taskId, stepId, stepText, stepCompleted) => {
  if (!taskId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(taskId)) throw new ApiError(400, errorTexts.common.invalidId);

  if (!stepId) throw new ApiError(400, errorTexts.common.badRequest);
  if (!validateId(stepId)) throw new ApiError(400, errorTexts.common.invalidId);

  if (!stepText && !stepCompleted) return;
  stepText = stepText.trim();
  if (!stepText) throw new ApiError(400, errorTexts.common.badRequest);
  if (typeof stepCompleted !== "boolean")
    throw new ApiError(400, errorTexts.common.badRequest);

  try {
    const result = await db.task(async (t) => {
      const userTask = await t.oneOrNone(
        `SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2`,
        [user.id, taskId]
      );

      if (!userTask || !userTask.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      let completedAt = "";
      if (stepCompleted) {
        completedAt = "completed_at=CURRENT_TIMESTAMP";
      } else completedAt = "completed_at=NULL";

      const editedStep = await t.oneOrNone(
        `UPDATE steps SET step_text=$1, step_completed=$2, ${completedAt} WHERE step_id=$3 RETURNING *`,
        [stepText, stepCompleted, stepId]
      );

      if (!editedStep)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return editedStep;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  get,
  create,
  edit,
};
