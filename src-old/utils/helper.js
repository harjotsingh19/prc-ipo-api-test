const Otp = require("../models/Otp");
const crypto = require("crypto");

// Generate a random 6-digit OTP
const generateOTP = async (userId, operation) => {
  const otp = crypto.randomInt(100000, 1000000);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  const otpRecord = new Otp({
    userId,
    otp,
    otpExpires,
    operation,
  });
  await otpRecord.save();
  console.log("otp record saved");
  return otp.toString();
};

const isAdmin = async (role) => {
  return role === "ADMIN";
};

const isCurrentUser = async (loginUserId, paramsId) => {
  return loginUserId && loginUserId.toString() == paramsId.toString();
};

const addFiltersToWhereClause = (filters) => {
  let searchClause = {};
  if (filters.filterString) {
    searchClause = {
      $or:
        filters.filterString &&
        filters?.searchByColumns.map((name) => ({
          [`${name}`]: filters.filterString,
        })),
    };
  }

  let filterDateClause = {};
  if ((filters.fromDate || filters.toDate) && filters.dateFilterColumn) {
    filterDateClause = addDateFiltersToWhereClause(
      filters.dateFilterColumn,
      filters.fromDate,
      filters.toDate
    );
  }

  let statusClause = {};
  if (filters.filterStatus) {
    statusClause = { active: filters.filterStatus };
  }

  return {
    $and: [searchClause, statusClause, filterDateClause],
  };
};

const addDateFiltersToWhereClause = (columns, startDate, endDate) => {
  let filterClause = {};
  if (!startDate) {
    filterClause[columns] = {
      $lte: moment(endDate).set({ hour: 23, minute: 59 }),
    };
  } else if (!endDate) {
    filterClause[columns] = { $gte: moment(startDate) };
  } else {
    filterClause[columns] = {
      $and: [
        { $gte: moment(startDate) },
        { $lte: moment(endDate).set({ hour: 23, minute: 59 }) },
      ],
    };
  }
  return filterClause;
};

module.exports = {
  generateOTP,
  isAdmin,
  isCurrentUser,
  addFiltersToWhereClause,
};
