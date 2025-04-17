const mongoose = require('mongoose');

const TokenVestingSchema = new mongoose.Schema({
    txnId: {
        type: mongoose.Schema.Types.ObjectId
    },
    txnHash: {
        type: String
    },
    claimedTokens: {
        type: Number,
        default: 0,
    },
    unclaimedTokens: {
        type: Number,
        default: 0,
    },
    lockedTokens: {
        type: Number,
        default: 0,
    },
    lockupPeriod: {
        startDate: Date,
        endDate: Date,
    },
    vestingSchedule: {
        startDate: Date,
        endDate: Date,
        tokensPerMonth: Number,
    },
    schedule: [{
        month: Number,
        claimAfter: Date,
        claimDate: Date,
        tokenAmount: Number,
        isClaimed: Boolean,
    }],
    investorAddress: {
        type: String,
    }
}, { timestamps: true });

module.exports = mongoose.model('TokenVesting', TokenVestingSchema);
