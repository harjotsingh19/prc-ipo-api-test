const apiResponse = {
  200: {
    description: "Ok",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Returns the status of the response",
            },
            message: {
              type: "string",
              description: "Message of the response",
            },
            data: {
              type: "object",
            },
          },
        },
      },
    },
  },
  400: {
    description: "Bad request",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Description of the error",
            },
          },
        },
      },
    },
  },
  401: {
    description: "Unauthorized user",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Description of the error",
            },
          },
        },
      },
    },
  },
  500: {
    description: "Server error",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Description of the error",
            },
          },
        },
      },
    },
  },
};

module.exports = {
  apiResponse,
};
