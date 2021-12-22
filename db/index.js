const pgPromise = require("pg-promise");
const { Users, Tasks, UsersTasks, Projects } = require("./repos");

const initOptions = {
  extend(obj, dc) {
    obj.users = new Users(obj, pgp);
    obj.tasks = new Tasks(obj, pgp);
    obj.usersTasks = new UsersTasks(obj, pgp);
    obj.projects = new Projects(obj, pgp);
  },
};

const pgp = pgPromise(initOptions);

const config = {
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
};

const db = pgp(config);

module.exports = {
  db,
  helpers: pgp.helpers,
};
