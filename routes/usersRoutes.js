const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMidlleware");
const {
  register,
  login,
  update,
  renew,
} = require("../controllers/usersController");

router.post("/register", register);
router.post("/login", login);
router.get("/update", auth, update);
router.get("/renew", auth, renew);

module.exports = router;
