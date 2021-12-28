const { db, helpers } = require("../db");
const ApiError = require("../errors/ApiError");
const { errorTexts } = require("../utils/constants");
const { mapToCamelCase, validateId } = require("../utils");

const validateUserTaskAccess = async (userId, taskId, context) => {
  const userTask = await context.usersTasks.getSingle(userId, taskId);
  if (userTask) {
    if (!userTask.can_edit)
      throw new ApiError(400, errorTexts.common.badRequest);
  } else {
    const projectId = await context.oneOrNone(
      "SELECT project_id FROM tasks WHERE task_id=$1",
      [taskId]
    );

    if (!projectId) throw new ApiError(400, errorTexts.common.badRequest);

    const usersProjects = await context.usersProjects.getSingle(
      userId,
      projectId.project_id
    );

    if (!usersProjects || !usersProjects.can_edit)
      throw new ApiError(400, errorTexts.common.badRequest);
  }
};

const get = async (user, taskId) => {
  try {
    const result = await db.task(async (t) => {
      await validateUserTaskAccess(user.id, taskId, t);

      const steps = t.steps.listForTask(taskId);

      return steps;
    });

    return mapToCamelCase(result);
  } catch (error) {
    throw error;
  }
};

const create = async (user, taskId, stepText, position) => {
  try {
    const result = await db.task(async (t) => {
      await validateUserTaskAccess(user.id, taskId, t);

      const createdStep = await t.steps.add(taskId, stepText, position);

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
      await validateUserTaskAccess(user.id, taskId, t);

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
      await validateUserTaskAccess(user.id, taskId, t);

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
      await validateUserTaskAccess(user.id, taskId, t);

      const removedStep = await t.steps.delete(stepId);

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
