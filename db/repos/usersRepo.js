class UsersRepository {
  constructor(db, pgp) {
    this.db = db;
    this.pgp = pgp;
  }

  async add(name, email, password) {
    return this.db.oneOrNone(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, password]
    );
  }

  async getByNameOrEmail(name, email) {
    return this.db.oneOrNone("SELECT * FROM users WHERE name=$1 OR email=$2", [
      name,
      email,
    ]);
  }

  async getById(id) {
    return this.db.oneOrNone("SELECT * FROM users WHERE user_id=$1", [id]);
  }
}

module.exports = UsersRepository;
