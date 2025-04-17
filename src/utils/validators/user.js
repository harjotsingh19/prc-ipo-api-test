const { check, validationResult } = require('express-validator');
const { httpResponse } = require("../../middleware/responseHandler");
const { statusCode } = require("../../config/constants");

exports.result = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return httpResponse(
            res,
            statusCode.badRequest,
            false,
            errors.array()[0].msg,
            []
        );
    }
    next();
};

exports.validateUpdateProfile = [
    check('name').trim().notEmpty().bail().withMessage('Name is required.'),
];

exports.validateChangePassword = [
    check('currentPassword').trim().notEmpty().bail().withMessage('Current password is required.'),
    check('newPassword').trim().notEmpty().bail().withMessage('New password is required.'),
    check('confirmPassword').trim().notEmpty().bail().withMessage('Confirm password is required.'),
];
