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

const uploadDocs = {
  post: {
    tags: ["KYC"],
    security: [{ bearerAuth: [] }],
    summary: "Upload docs related to kyc verification",
    description: "Upload docs related to kyc verification",
    operationId: "uploadDocs",
    consumes: ["multipart/form-data"],
    parameters: [
      {
        in: "formData",
        name: "idProofFront",
        type: "file",
        required: true,
        description: "The front side of the ID proof to upload",
      },
      {
        in: "formData",
        name: "idProofBack",
        type: "file",
        required: true,
        description: "The back side of the ID proof to upload",
      },
      {
        in: "formData",
        name: "selfie",
        type: "file",
        required: true,
        description: "A selfie of the user to upload",
      },
      {
        in: "formData",
        name: "userId",
        type: "string",
        required: true,
        description: "The user's unique ID",
      },
      {
        in: "formData",
        name: "country",
        type: "string",
        required: true,
        description: "The user's country",
      },
      {
        in: "formData",
        name: "idDocType",
        type: "string",
        required: true,
        description: "The type of ID document (e.g., passport, license)",
      },
      {
        in: "formData",
        name: "firstName",
        type: "string",
        required: true,
        description: "The user's first name",
      },
      {
        in: "formData",
        name: "lastName",
        type: "string",
        required: true,
        description: "The user's last name",
      },
      {
        in: "formData",
        name: "email",
        type: "string",
        required: true,
        description: "The user's email address",
      },
    ],
    responses: apiResponse,
  },
};

module.exports = {
  apiResponse,
  uploadDocs,
};
