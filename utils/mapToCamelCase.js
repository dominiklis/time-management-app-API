// const user = require("./mappingFunctions/mapUserToCamelCase");
// const task = require("./mappingFunctions/mapTaskToCamelCase");
// const project = require("./mappingFunctions/mapProjectToCamelCase");
// const projectsTasks = require("./mappingFunctions/mapProjectsTasksToCameCase");

const mapToCamelCase = (obj) => {
  const result = {};
  Object.keys(obj).forEach((key) => {
    const keyParts = key.split("_");
    if (keyParts.length === 1) return (result[key] = obj[key]);

    let newKey = keyParts[0];
    for (let i = 1; i < keyParts.length; i++) {
      newKey +=
        keyParts[i][0].toUpperCase() +
        keyParts[i].substring(1, keyParts[i].length);
    }
    return (result[newKey] = obj[key]);
  });

  return result;
};

module.exports = mapToCamelCase;

// module.exports = {
//   user,
//   task,
//   project,
//   projectsTasks,
// };
