const user = require("./mappingFunctions/mapUserToCamelCase");
const task = require("./mappingFunctions/mapTaskToCamelCase");
const project = require("./mappingFunctions/mapProjectToCamelCase");

module.exports = {
  user,
  task,
  project,
};
