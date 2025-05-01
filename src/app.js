const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const routes = require("./routes");
const config = require("./config/config");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const { swaggerDefinition } = require("./utils/swagger.js");
const { httpResponse } = require("./middleware/responseHandler");
const createAdmin = require("./seeders/createAdmin.js");
const {
  statusCode,
  message,
  status: userStatus,
} = require("./config/constants");

require("./db/mongoose");

mongoose.connection.once("connectedReady", async () => {
  await createAdmin();
});
require("./utils/saleScheduler.js");

require("./utils/addWalletScheduler.js");

const swaggerSpec = swaggerJsDoc(swaggerDefinition);
const rateLimit = require("express-rate-limit");

const { setUpSendGrid } = require("../src/utils/mailManager");

const app = express();

app.disable("x-powered-by");

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  handler: (req, res, next) => {
    return httpResponse(
      res,
      statusCode.tooManyRequest,
      false,
      message.tooManyRequests
    );
  },
});

app.use((req, res, next) => {
  if (req.path === "/webhook") {
    return next();
  }
  limiter(req, res, next);
});

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
