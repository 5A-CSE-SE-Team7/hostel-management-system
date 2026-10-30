/** Standard API error. Serialized as {errorCode, message, details?, requestId} (SAD 4.4). */
class ApiError extends Error {
  constructor(status, errorCode, message, details) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

const E = {
  validation: (details, message = 'Validation failed') => new ApiError(400, 'VALIDATION_ERROR', message, details),
  unauthenticated: (message = 'Authentication required') => new ApiError(401, 'UNAUTHENTICATED', message),
  invalidCredentials: () => new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
  forbidden: (message = 'You do not have permission to perform this action') => new ApiError(403, 'FORBIDDEN', message),
  notFound: (what = 'Resource') => new ApiError(404, 'NOT_FOUND', `${what} not found`),
  conflict: (message, errorCode = 'CONFLICT', details) => new ApiError(409, errorCode, message, details),
};

module.exports = { ApiError, E };
