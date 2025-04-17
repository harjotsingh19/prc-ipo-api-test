const Otp = require("../models/Otp");
const crypto = require('crypto');

// Generate a random 6-digit OTP
const generateOTP = async (userId, operation) => {
    const otp = crypto.randomInt(100000, 1000000)
    const otpExpires = new Date(Date.now() + 1 * 60 * 1000)
    const otpRecord = new Otp({
        userId,
        otp,
        otpExpires,
        operation,
    });
    await otpRecord.save();
    console.log("otp record saved")
    return otp.toString();
}

const isAdmin = async (role) => {
    return role === "ADMIN";
}

const isCurrentUser = async (loginUserId, paramsId) => {
    return (loginUserId && (loginUserId.toString() == paramsId.toString()));
}

module.exports = { generateOTP, isAdmin, isCurrentUser };