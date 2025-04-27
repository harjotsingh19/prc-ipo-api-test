const express = require("express");
const path = require("path");
const routes = require("./routes");
const config = require("./config/config");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const { swaggerDefinition } = require("./utils/swagger.js");
require("./db/mongoose");
const swaggerSpec = swaggerJsDoc(swaggerDefinition);

const { setUpSendGrid } = require("../src/utils/mailManager");

const app = express();
app.disable("x-powered-by");

app.use(morgan("tiny"));

app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
  methods: "GET, POST, PUT, PATCH, DELETE",
};

app.use(cors(corsOptions));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toLocaleString(),
    uptime: process.uptime(),
  });
});

setUpSendGrid();

app.use("", routes);

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: { displayRequestDuration: true },
  })
);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
