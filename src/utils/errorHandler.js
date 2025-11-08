class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

const formatErrorResponse = (error, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response = {
    success: false,
    error: {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR',
      statusCode: error.statusCode || 500
    }
  };
  if (isDevelopment && error.stack) {
    response.error.stack = error.stack;
  }
  if (isDevelopment) {
    response.error.request = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body
    };
  }
  return response;
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const globalErrorHandler = (error, req, res, next) => {
  if (error.statusCode >= 500) {
    console.error('Server Error:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  const errorResponse = formatErrorResponse(error, req);
  res.status(errorResponse.error.statusCode).json(errorResponse);
};

const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

const validationErrorHandler = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const validationError = new ValidationError(
      'Validation failed',
      error.details || error.message
    );
    return next(validationError);
  }
  next(error);
};

const databaseErrorHandler = (error, req, res, next) => {
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    if (error.code === 11000) {
      const conflictError = new ConflictError('Resource already exists');
      return next(conflictError);
    }
    const dbError = new AppError('Database operation failed', 500, 'DATABASE_ERROR');
    return next(dbError);
  }
  next(error);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  globalErrorHandler,
  notFoundHandler,
  validationErrorHandler,
  databaseErrorHandler,
  asyncHandler,
  formatErrorResponse
};
