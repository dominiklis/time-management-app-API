const express = require("express");
const router = express.Router();
const { auth, validateUserRequestBody } = require("../middleware");
const {
  register,
  login,
  update,
  renew,
} = require("../controllers/usersController");

const validateRegisterBody = validateUserRequestBody();
const validateLoginBody = validateUserRequestBody(true);

router.post("/register", validateRegisterBody, register);
router.post("/login", validateLoginBody, login);
router.put("/", auth, update);
router.get("/renew", auth, renew);

module.exports = router;
