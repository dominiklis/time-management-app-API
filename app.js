require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;

const morgan = require("morgan");

// middleware
app.use(morgan("dev"));

// routes
const apiRoute = process.env.API_ROUTE || "/api";

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => console.log(`app listening at port ${port}`));
