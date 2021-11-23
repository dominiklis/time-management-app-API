const accessLevels = {
  view: "view",
  edit: "view, edit",
  delete: "view, edit, delete",
};

const errorTexts = {
  common: {
    badRequest: "bad request",
    somethingWentWrong: "something went wrong",
    invalidId: "invalid id",
  },

  users: {
    requiredRegisterFields:
      "name, email and password are required to register new user",
    requiredLoginFields: "password and email or username are required",
    invalidName: "invalid username",
    invalidEmail: "invalid email",
    invalidPassword:
      "invalid password (min. 6 characters long with 1 uppercase letter, 1 lowercase, 1 number and 1 symbol)",
    invalidFields:
      "invalid username, email or password (min. 6 characters long with 1 uppercase letter, 1 lowercase, 1 number and 1 symbol)",
    accountAlreadyExists: "account with this username or email already exists",
    emailOrUsernameTaken: "user with this email or username already exists",
  },

  tasks: {
    nameIsRequired: "name for task is required",
  },

  access: {
    userHasAccess: "user arleady has an access",
    invalidAccessLevel: `invalid access level (valid are '${accessLevels.view}', '${accessLevels.edit}' or '${accessLevels.delete}')`,
  },

  projects: {
    nameIsRequired: "name for project is required",
  },
};

module.exports = {
  accessLevels,
  errorTexts,
};
