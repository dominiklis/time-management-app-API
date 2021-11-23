const user = require("./mappingFunctions/mapUserToCamelCase");
const task = require("./mappingFunctions/mapTaskToCamelCase");
const project = require("./mappingFunctions/mapProjectToCamelCase");
const projectsTasks = require("./mappingFunctions/mapProjectsTasksToCameCase");

module.exports = {
  user,
  task,
  project,
  projectsTasks,
};
