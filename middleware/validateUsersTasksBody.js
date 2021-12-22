const ApiError = require("../errors/ApiError");
const { validateId, validateUsername, validateEmail } = require("../utils");
const { errorTexts } = require("../utils/constants");

const validateUsersTasksBody =
  (requireUser = false, requireAllPermissions = false) =>
  (req, res, next) => {
    let {
      userId,
      userName,
      userEmail,
      canShare,
      canChangePermissions,
      canEdit,
      canDelete,
    } = req.body;

    // validate user id
    if (userId) {
      if (!validateId(userId))
        throw new ApiError(400, "invalid user id - id must be uuid");
    } else req.body.userId = null;

    // validate user name
    if (userName) {
      userName = userName.trim();
      if (!validateUsername(userName)) {
        throw new ApiError(400, errorTexts.users.invalidName);
      }
      req.body.userName = userName;
    } else req.body.userName = null;

    // validate email
    if (userEmail) {
      if (!validateEmail(userEmail))
        throw new ApiError(400, "invalid user id - id must be uuid");
    } else req.body.userEmail = null;

    if (requireUser)
      if (!userId && !userName && !userEmail)
        throw new ApiError(
          400,
          "one of the user id, name or email is required"
        );

    // validate canShare
    if (typeof canShare !== "boolean") {
      if (requireAllPermissions)
        throw new ApiError(400, "all permissions are required");

      req.body.canShare = false;
    }

    // validate canChangePermissions
    if (typeof canChangePermissions !== "boolean") {
      if (requireAllPermissions)
        throw new ApiError(400, "all permissions are required");

      req.body.canChangePermissions = false;
    }

    // validate canEdit
    if (typeof canEdit !== "boolean") {
      if (requireAllPermissions)
        throw new ApiError(400, "all permissions are required");

      req.body.canEdit = false;
    }

    // validate canDelete
    if (typeof canDelete !== "boolean") {
      if (requireAllPermissions)
        throw new ApiError(400, "all permissions are required");

      req.body.canDelete = false;
    }

    next();
  };

module.exports = validateUsersTasksBody;
