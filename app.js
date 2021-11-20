require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const morgan = require("morgan");

const { usersRouter, tasksRouter } = require("./routes");

const helmet = require("helmet");
const cors = require("cors");
const handleErrors = require("./middleware/handleErrors");
const auth = require("./middleware/authMidlleware");

// middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
app.use(helmet());

// routes
const apiRoute = process.env.API_ROUTE || "/api";

app.use(`${apiRoute}/users`, usersRouter);
app.use(`${apiRoute}/tasks`, auth, tasksRouter);

// error handling
app.use(handleErrors);

app.listen(port, () => console.log(`app listening at port ${port}`));
