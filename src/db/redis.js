// const createClient = require("redis").createClient;
// const config = require("../config/config");

// const redisClient = createClient({ url: config.redisUrl });

// redisClient.on("error", (err) => console.log("Redis redisClient Error", err));

// redisClient.connect();

// async function initializeBlock(key, defaultValue) {
//     const value = JSON.parse(await redisClient.get(key));
//     if (!value) {
//       await redisClient.set(key, defaultValue);
//     }
// }

// const defaultBlockValue = 0;

// initializeBlock('transaction_last_block', defaultBlockValue);
// initializeBlock('sale_last_block', defaultBlockValue);
// initializeBlock('icofinalized_last_block', defaultBlockValue);
// initializeBlock('user_status_update_last_block', defaultBlockValue);
// initializeBlock('claim_token_last_block', defaultBlockValue);
// initializeBlock('sale_finalize_last_block', defaultBlockValue);

// module.exports = redisClient;
