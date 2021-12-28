const { db, helpers } = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const get = async (user, taskId) => {
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

const create = async (user, taskId, stepText, position) => {
  try {
    const result = await db.task(async (t) => {
      const userTask = await t.oneOrNone(
        "SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2",
        [user.id, taskId]
      );

      if (!userTask || !userTask.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const createdStep = await t.oneOrNone(
        "INSERT INTO steps (task_id, step_text, position) VALUES ($1, $2, $3) RETURNING *",
        [taskId, stepText, position]
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

const editMultiple = async (user, taskId, stepsToUpdate) => {
  if (stepsToUpdate.length === 0)
    throw new ApiError(400, errorTexts.common.badRequest);

  if (
    stepsToUpdate.length > 1 &&
    stepsToUpdate.filter((s) => {
      if (!s.taskId) return true;
      if (!validateId(s.taskId)) return true;
      if (s.taskId !== taskId) return true;
      if (!s.stepId) return true;
      if (!validateId(s.stepId)) return true;
      if (!s.stepText) return true;
      if (typeof s.stepCompleted !== "boolean") return true;
      s.position = parseInt(s.position);
      if (typeof s.position !== "number" || isNaN(s.position)) return true;

      return false;
    }).length > 0
  )
    throw new ApiError(400, errorTexts.common.badRequest);

  try {
    const result = await db.task(async (t) => {
      const userTask = await t.oneOrNone(
        `SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2`,
        [user.id, taskId]
      );

      if (!userTask || !userTask.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const cs = new helpers.ColumnSet(
        [
          { name: "step_id", prop: "stepId", cnd: true, cast: "uuid" },
          { name: "step_text", prop: "stepText" },
          { name: "step_completed", prop: "stepCompleted" },
          { name: "completed_at", prop: "completedAt", cast: "timestamptz" },
          { name: "position" },
        ],
        {
          table: "steps",
        }
      );

      let query =
        helpers.update(stepsToUpdate, cs) +
        " WHERE uuid(v.step_id) = t.step_id RETURNING *";

      const updatedSteps = await t.manyOrNone(query);

      if (updatedSteps.length === 0)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return updatedSteps;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const edit = async (
  user,
  taskId,
  stepId,
  stepText,
  stepCompleted,
  position
) => {
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
        `UPDATE steps SET step_text=$1, step_completed=$2, position=$3, ${completedAt} WHERE step_id=$4 RETURNING *`,
        [stepText, stepCompleted, position, stepId]
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

const remove = async (user, taskId, stepId) => {
  try {
    const result = await db.task(async (t) => {
      const usersTasks = await t.oneOrNone(
        `SELECT * FROM users_tasks WHERE user_id=$1 AND task_id=$2`,
        [user.id, taskId]
      );

      if (!usersTasks || !usersTasks.can_edit)
        throw new ApiError(400, errorTexts.common.badRequest);

      const removedStep = await t.oneOrNone(
        "DELETE FROM steps WHERE step_id=$1 RETURNING *",
        [stepId]
      );

      if (!removedStep)
        throw new ApiError(500, errorTexts.common.somethingWentWrong);

      return removedStep;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  get,
  create,
  editMultiple,
  edit,
  remove,
};
