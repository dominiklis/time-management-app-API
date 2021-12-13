const pgp = require("pg-promise")();

const cn = {
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
};

const db = pgp(cn);

module.exports = {
  db,
  helpers: pgp.helpers,
};
