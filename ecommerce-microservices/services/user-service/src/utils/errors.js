// Base API Error class
class APIError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
class BadRequestError extends APIError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

// 401 Unauthorized
class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

// 403 Forbidden
class ForbiddenError extends APIError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// 404 Not Found
class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

// 409 Conflict
class ConflictError extends APIError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

// 422 Unprocessable Entity
class ValidationError extends APIError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

// 429 Too Many Requests
class TooManyRequestsError extends APIError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

// 500 Internal Server Error
class InternalServerError extends APIError {
  constructor(message = 'Internal server error') {
    super(message, 500, false);
  }
}

// 503 Service Unavailable
class ServiceUnavailableError extends APIError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

// Database errors
class DatabaseError extends InternalServerError {
  constructor(message = 'Database error occurred') {
    super(message);
  }
}

// External service errors
class ExternalServiceError extends APIError {
  constructor(message = 'External service error', statusCode = 502) {
    super(message, statusCode);
  }
}

module.exports = {
  APIError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
};
