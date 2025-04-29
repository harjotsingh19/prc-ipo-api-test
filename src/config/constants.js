const message = {
  // Auth
  enterAccessToken: "Enter access token",
  invalidToken: "Invalid access token",
  loginSuccessfully: "Login Successfully",
  userIsNotAdmin: "User is not a Admin",

  // OTP
  accountVerification: "Account Verification",
  otpSentSuccessfully: "OTP has been sent to your email, please verify.",
  otpExpired: "OTP is expired or invalid",
  userAlreadyVerified: "User is already verified",
  invalidOtp: "Invalid OTP",
  otpVerified: "OTP Verified successfully",
  otpResentSuccess: "OTP has been resent successfully",
  resetLinkSent: "Reset link sent to your email",
  resetRequest: "Reset Request",
  invalidResetToken: "Invalid or expired reset token",
  invalidCredentials: "Invalid credentials",
  passwordNotMatch: "New password and confirm password do not match",
  passwordUpdated: "Password updated successfully",
  phoneAlreadyVerified: "Phone already verified",
  emailNotSent: "Email not sent",
  invalidOperation: "Invalid operation",

  // Investor / Admin
  walletAddressAlreadyExists: "Wallet Address already exists",
  walletAddressAddedSuccessfully: "Wallet address added successfully",
  adminAlreadyExists: "Admin already exists",
  userAlreadyExists: "User already exists",
  userEmailAlreadyExists: "A user with this email address already exists.",
  singleInvestorReturned: "Investor returned",

  userNotCreatedOnStripe: "Error creating user on stripe",
  userWalletUpdated: "User wallet updated successfully",
  userDoesnotExists: "User doesn't exists",
  userIsBlocked: "This user is blocked and is not allowed to purchase tokens.",
  noChangeDetected:
    "No changes detected. The user's block status is already set to the requested value.",

  userNotActive:
    "User is not active, please contact admin for further assistance",
  userNotVerified: "User is not verified",
  kycPending: "KYC Verification is pending",
  wrongPassword: "Incorrect credentials. Please try again.",
  invalidPassword: "Password is invalid",
  credentialsResetSuccess: "Credentials reset successfully",
  credentialsResetFailed: "Credentials reset failed",
  allInvestorsReturned: "Returned all investors",
  allInvestmentsReturned: "Returned all investments",
  adminAddressSet: "Successfully set admin address",
  adminAddressIsAlreadySet: "Admin wallet address is already set.",
  addressWhitelistSuccess: "Wallet address whitelisted successfully",
  alreadyAddressWhitelisted: "Wallet address already whitelisted",
  investorInvestmentsFetched: "Investor investment fetched successfully",
  noRecordFound: "No record found",
  fetchWhitelistAddressSuccess: "Whitelist address fetched successfully",
  dashboardDataFetchSuccess: "Dashboard data fetched successfully",
  dataFetchSuccess: "Data fetched successfully",
  tokenClaimedSuccess: "Token claimed successfully",
  transactionNotFound: "Transaction not found",
  transactionIdRequired: "Transaction ID is required",
  transactionDetailsFetched: "Transaction details fetched successfully",
  tokenRefreshedSuccessfully: "Token refreshed successfully",

  vestingDataNotFound: "Vesting data not found",
  fetchBlacklistAddressSuccess: "Blacklist address fetched successfully",
  onchainIdUpdated: "Investor onchain id updated successfully",
  kycNotVerified: "Investor kyc is not verified",
  walletAddressRequired: "Wallet address is required",
  wrongPasswd: "Current password is incorrect",

  // Sales
  allSalesReturned: "All sales returned",
  saleAlreadyExists: "This sale already exists",
  saleCreated: "Sale created successfully",
  saleNotFound: "Sale not found",
  saleEnded: "Sale ended successfully",
  SaleDataReturned: "Sale data returned",
  SaleNameAlreadyExists: "Sale name already exists",
  allTransactionReturned: "All transaction Fetched Successfully",
  allTransactionUpdated: "Transaction Updated Successfully",
  saleNotActive: "Sale does not exist or is not active.",
  ActiveSaleAlreadyExists: "Another active sale is already running.",
  FutureSaleOverlapError:
    "Another sale is scheduled to start within the time frame of the new sale. Please choose different start and end times to avoid overlapping with an existing future sale.",

  //stripe
  missingMetadata: "Required metadata is missing in the session.",

  sentSessionUrl: "payment url sent successfully",
  paymentStatusNotPaid:
    "Payment status is not 'paid'. Please check the payment status.",

  // Token
  tokenDetailsReturned: "Token details returned",
  tokenCreated: "Token created successfully",
  icoFinalizedSuccess: "ICO finalized successfully",
  tooManyRequests: "Too many requests from this IP. Please try after some time",

  tokenDocumentNotFound: "Token document not found.",
  tokensCreditedSuccessfully: "Tokens credited successfully.",

  // User
  unauthorizedUser: "User is not authorized",
  userBlockSuccess: "User blocked successfully",
  userUnblockSuccess: "User unblocked successfully",
  profileUpdateSuccess: "Profile updated successfully",
  emailAlreadyExist: "Email already exist",
  emailNotExist: "email does not exist",
  phoneAlreadyExist: "Phone already exist",
  userActivityRecorded: "Activity recorded successfully",
  mfaEnableSuccess: "Multi factor authentication enabled successfully",
  mfaVerifiedSuccess: "Multi factor authentication verified successfully",
  fetchProfileSuccess: "User profile fetched successfully",
  emailNotVerified: "User email not verified",
  logoutSuccess: "Logout successfully",
  credsChangeSuccess: "Details updated successfully",
  kycStatusUpdated: "Kyc status updated successfully",
  fetchTokenClaimHistorySuccess: "Claim Token history fetched successfully",
  kycStatusUpdateError: "KYC status update on blockchain failed",

  // Analytics
  saleStatisticsFetchSuccess: "Sale statistics data fetched successfully",
  userAnalyticsFetchSuccess: "User Analytics data fetched successfully",
  distributionAnalyticsFetchSuccess:
    "Distribution Analytics data fetched successfully",

  // Notification
  notificationFetchSuccess: "All notification fetched successfully",
  notificationMarkedRead: "Notification marked read successfully",
  allNotificationMarkedRead: "All notifications marked read successfully",

  //webhook
  webhookProcessingError: "Error processing the webhook.",
  webhookSignatureVerificationFailed: "Webhook signature verification failed.",

  //validation
  validationError: "Validation failed",
};

const statusCode = {
  ok: 200,
  created: 201,
  accepted: 202,
  found: 302,
  badRequest: 400,
  unAuthorized: 401,
  noContent: 204,
  forbidden: 403,
  errorPage: 404,
  serverError: 500,
};

const status = {
  NEW: "NEW",
  EMAIL_VERIFICATION_PENDING: "EMAIL_VERIFICATION_PENDING",
  EMAIL_VERIFIED: "EMAIL_VERIFIED",
  KYC_INITIATED: "KYC_INITIATED",
  KYC_INPROGRESS: "KYC_INPROGRESS",
  KYC_BLOCKED: "KYC_BLOCKED",
  KYC_REJECTED: "KYC_REJECTED",
  KYC_SUCCESS: "KYC_SUCCESS",
  COMPLETED: "COMPLETED",
  FINAL: "FINAL",
  RETRY: "RETRY",
  RED: "RED",
  GREEN: "GREEN",
};

const roles = {
  ADMIN: "ADMIN",
  INVESTOR: "INVESTOR",
};

const otpOperations = {
  emailVerification: 1,
  phoneVerification: 2,
  updateWallet: 3,
};

const tokenScheduleMonth = {
  lockup: 6,
  vesting: 12,
};

const notificationCategory = {
  kyc: 1,
};

const userStatusOnBlockchain = {
  Normalized: 0,
  whitelisted: 1,
  KycVerified: 2,
  blacklisted: 3,
};

const kycRequestNotificationMsg = (name) => {
  return `${name} requested for kyc verification.`;
};

const kycReUploadNotificationMsg = (name) => {
  return `${name} re-uploaded the docs and requested for kyc verification.`;
};

const emailTemplateId = {
  investorKycUnderReview: "d-afe0dbf1566444b9a49b0dbd996727cd",
  investorKycReject: "d-6bb61bb3209346a6b4ce8b4e049a794a",
  adminNewKycRequest: "d-a8c843a428564e8b8ba66de5e8a8ab4e",
  adminResetPassword: "d-2321dc47bc884cb69584f5a06f653c5a",
  emailVerification: "d-0ef5c6c8109d4118af682e7dc85b7cd1",
  resetPassword: "d-fcbaa17104744f608f2b1ca57af0d198",
  updateWallet: "d-78d6042282d84c858ebf0b8c97fd44ae",
  addWallet: "d-05eb49bd4d694d8f8c5e0288f3929d19",
  airdropUpdate: "d-1b7ff7febe42469095bc5433c58bc92b",
};

const responseStatus = {
  success: 1,
  failure: 0,
};

module.exports = {
  message,
  statusCode,
  status,
  responseStatus,
  roles,
  otpOperations,
  // phoneOtpVerificationMsg,
  tokenScheduleMonth,
  notificationCategory,
  userStatusOnBlockchain,
  // kycRequestNotificationMsg,
  // kycReUploadNotificationMsg,
  emailTemplateId,
};
