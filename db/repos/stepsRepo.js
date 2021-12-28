class StepsRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
  }

  async listForTask(taskId) {
    return this.db.manyOrNone("SELECT * FROM steps WHERE task_id=$1;", [
      taskId,
    ]);
  }

  async add(taskId, stepText, position) {
    return this.db.oneOrNone(
      "INSERT INTO steps (task_id, step_text, position) VALUES ($1, $2, $3) RETURNING *",
      [taskId, stepText, position]
    );
  }

  async delete(stepId) {
    return this.db.oneOrNone("DELETE FROM steps WHERE step_id=$1 RETURNING *", [
      stepId,
    ]);
  }
}

module.exports = StepsRepository;
