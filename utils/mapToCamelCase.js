const mapToCamelCase = (obj) => {
  if (!obj || typeof obj !== "object" || typeof obj.getMonth === "function")
    return obj;

  if (Array.isArray(obj)) {
    const result = [];
    obj.forEach((o) => {
      result.push(mapToCamelCase(o));
    });

    return result;
  }

  const result = {};
  Object.keys(obj).forEach((key) => {
    const keyParts = key.split("_");

    let newKey = keyParts[0];
    for (let i = 1; i < keyParts.length; i++) {
      newKey +=
        keyParts[i][0].toUpperCase() +
        keyParts[i].substring(1, keyParts[i].length);
    }

    let value = obj[key];
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        const valueArr = [];
        value.forEach((v) => valueArr.push(mapToCamelCase(v)));
        value = valueArr;
      } else {
        value = mapToCamelCase(value);
      }
    }

    return (result[newKey] = value);
  });

  return result;
};

module.exports = mapToCamelCase;
