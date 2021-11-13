require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const morgan = require("morgan");

const { usersRouter } = require("./routes");

const handleErrors = require("./middleware/handleErrors");
// const auth = require("./middleware/authMidlleware");

// middleware
app.use(express.json());
app.use(morgan("dev"));

// routes
const apiRoute = process.env.API_ROUTE || "/api";

app.use(`${apiRoute}/users`, usersRouter);

// error handling
app.use(handleErrors);

app.listen(port, () => console.log(`app listening at port ${port}`));
