'use strict';
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // name: {
  //   type: String,
  //   default: ""
  // },
  firstName: {
    type: String,
    default: ""
  },
  lastName: {
    type: String,
    default: ""
  },
  email: {
    type: String,
    default: ""
  },
  password: {
    type: String,
    default: ""
  },
  // phone: {
  //   type: String,
  // },
  // countryCode: {
  //   type: String,
  // },
  role: {
    type: String,
    default: "",
  },
  // onchainId: {
  //   type: String,
  //   default: "",
  // },
  // walletAddress: {
  //   type: String,
  //   default: "",
  // },
  status: {
    type: String,
    default: ""
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // isKycVerified: {
  //   type: Boolean,
  //   default: false
  // },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // isPhoneVerified: {
  //   type: Boolean,
  //   default: false
  // },
  isActive: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isDeactivated: {
    type: Boolean,
    default: false
  },
  statusHistory: [
    {
      status: String,
      timestamp: String,
      reason: String
    }
  ],
  // sumsubApplicantId: {
  //   type: String,
  //   default: ""
  // },
  resetPasswordToken: {
    type: String,
    default: ""
  },
  resetPasswordExpires: {
    type: Date,
    default: ""
  },
  // isMfaEnabled: {
  //   type: Boolean,
  //   default: false
  // },
  // mfaSecret: {
  //   type: String,
  //   default: null
  // },
  // isKycRejected: {
  //   type: Boolean,
  //   default: false
  // },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', userSchema);

