require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/rva',
  redisUrl: process.env.REDIS_URI || 'redis://localhost:6379',
  adminFrontendUrl: process.env.ADMIN_FRONTEND_URL,
  userFrontendUrl: process.env.USER_FRONTEND_URL,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY,


  sendGridEmailAddress: process.env.SEND_GRID_EMAIL_ADDRESS,
  sendGridApiKey: process.env.SEND_GRID_API_KEY,


};