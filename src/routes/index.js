const express = require('express');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const investorRoutes = require('./investorRoutes');
const userRoutes = require('./userRoutes');
// const notificationRoutes = require('./notificationRoutes');

const router = express.Router();




router.use('/auth', authRoutes)
// router.use('/admin', adminRoutes);
// router.use('/investor', investorRoutes)
// router.use('/kyc', kycRoutes)
// router.use('/user', userRoutes);
// router.use('/notifications', notificationRoutes);

module.exports = router;