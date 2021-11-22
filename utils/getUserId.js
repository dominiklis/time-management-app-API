const db = require("../db");

const getUserId = async (email, name) => {
  const { rows } = await db.query(
    "SELECT user_id FROM users WHERE email=$1 OR name=$2",
    [email, name]
  );

  if (rows.length !== 0) {
    return rows[0].user_id;
  }

  return null;
};

module.exports = getUserId;
