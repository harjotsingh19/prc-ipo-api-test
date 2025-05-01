const cron = require("node-cron");
const dayjs = require("dayjs");
const Sale = require("../models/Sale");

cron.schedule("* * * * *", async () => {
  try {
    const now = dayjs();

    const salesToStart = await Sale.find({
      startDate: { $lte: now.toDate() },
      endDate: { $gt: now.toDate() },
      active: false,
    });

    for (const sale of salesToStart) {
      await Sale.findByIdAndUpdate(sale._id, { active: true });
      console.log(`✅ Sale "${sale.name}" started automatically.`);
      console.log(
        "time when sale becomes active :",
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    }

    const salesToEnd = await Sale.find({
      endDate: { $lte: now.toDate() },
      active: true,
    });

    for (const sale of salesToEnd) {
      await Sale.findByIdAndUpdate(sale._id, { active: false });
      console.log(`🛑 Sale "${sale.name}" ended automatically.`);
      console.log(
        "time when sale becomes inactive :",
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    }
  } catch (error) {
    console.error("❌ Error in Sale Scheduler:", error.message);
  }
});
