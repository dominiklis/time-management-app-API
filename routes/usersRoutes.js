const express = require("express");
const router = express.Router();
const {
  register,
  login,
  update,
  renew,
} = require("../controllers/usersController");

router.get("/register", register);
router.get("/login", login);
router.get("/update", update);
router.get("/renew", renew);

module.exports = router;
