const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
  try {
    let token = req.header("authorization");
    token = token.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (error) {
    res.status(401).send("invalid token");
  }
};

module.exports = auth;
