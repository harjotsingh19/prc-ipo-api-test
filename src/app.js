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
const {
  transactionCron,
  createSaleCron,
  saleFinalizeCron,
  icoFinalizedCron,
  userStatusUpdateCron,
  claimTokenCron,
} = require("./utils/cron");
const { setUpSendGrid } = require("../src/utils/mailManager");

const app = express();
app.disable("x-powered-by");

app.use(morgan("tiny"));
app.use(bodyParser.json());
app.use(express.json());

// For Connecting Frontend to backend
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200, // For legacy browser support
  methods: "GET, POST, PUT, PATCH, DELETE",
};

app.use(cors(corsOptions));

// Route to check the application health.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toLocaleString(),
    uptime: process.uptime(),
  });
});

// Setting SendGrid Api Key
setUpSendGrid();

app.use("", routes);

// Route for swagger
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: { displayRequestDuration: true },
  })
);

// Enable access uploads file from frontend
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.listen(config.port, () => {
  console.log(`Serverrr running on port ${config.port}`);
});
