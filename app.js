require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");

const routes = require("./routes");

const { handleErrors } = require("./middleware");

// middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
app.use(helmet());

// routes
const apiRoute = process.env.API_ROUTE || "api";
app.use(`/${apiRoute}`, routes);
app.get("/", (req, res) => res.status(200).send("app is working"));

// error handling
app.use(handleErrors);

app.listen(port, () => console.log(`app listening at port ${port}`));
