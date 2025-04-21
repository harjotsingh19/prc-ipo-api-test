const express = require("express");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const investorRoutes = require("./investorRoutes");
const saleRoutes = require("./saleRoutes");
const userRoutes = require("./userRoutes");
const webhookRoutes = require("./webhookRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/sales", saleRoutes);
router.use("/investor", investorRoutes);
// router.use('/kyc', kycRoutes)
router.use("/user", userRoutes);
// router.use('/notifications', notificationRoutes);
router.use("/webhook", webhookRoutes);

module.exports = router;
