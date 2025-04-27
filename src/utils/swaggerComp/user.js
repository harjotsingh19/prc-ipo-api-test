const { apiResponse } = require("./common");

const updateProfile = {
  patch: {
    tags: ["User"],
    security: [{ bearerAuth: [] }],
    summary: "Update user profile",
    description: "Update user profile",
    operationId: "updateProfile",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        description: "Enter user id",
        schema: {
          type: "string",
        },
      },
      {
        in: "body",
        name: "userData",
        schema: {
          type: "object",
          // required: ['name'],
          properties: {
            firstName: {
              type: "string",
            },
            lastName: {
              type: "string",
            },
            email: {
              type: "string",
            },
            password: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const addUserActivity = {
  post: {
    tags: ["User"],
    summary: "Add user activity",
    description: "Add user activity",
    operationId: "addUserActivity",
    parameters: [
      {
        in: "body",
        name: "UserActivityData",
        schema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
            },
            timestamp: {
              type: "number",
            },
            from: {
              type: "string",
            },
            message: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const getUserProfile = {
  get: {
    tags: ["User"],
    security: [{ bearerAuth: [] }],
    summary: "Get user Profile Data",
    description: "Get user Profile Data",
    operationId: "me",
    parameters: [],
    responses: apiResponse,
  },
};

const logout = {
  post: {
    tags: ["User"],
    security: [{ bearerAuth: [] }],
    summary: "Logout",
    description: "Logout",
    operationId: "logout",
    parameters: [
      {
        in: "body",
        name: "logoutData",
        schema: {
          type: "object",
          required: ["deviceId"],
          properties: {
            deviceId: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const changePassword = {
  put: {
    tags: ["User"],
    security: [{ bearerAuth: [] }],
    summary: "Change password",
    description: "Change password",
    operationId: "changePassword",
    parameters: [
      {
        in: "body",
        name: "data",
        schema: {
          type: "object",
          required: ["currentPassword", "newPassword", "confirmPassword"],
          properties: {
            currentPassword: {
              type: "string",
            },
            newPassword: {
              type: "string",
            },
            confirmPassword: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

module.exports = {
  updateProfile,
  addUserActivity,
  getUserProfile,
  logout,
  changePassword,
};
