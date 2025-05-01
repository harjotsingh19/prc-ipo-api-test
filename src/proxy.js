// proxyServer.js
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// Forward everything to :3003
app.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:3003",
    changeOrigin: true,
  })
);

app.listen(3000, () => {
  console.log("Proxy server running at http://localhost:3000");
});
