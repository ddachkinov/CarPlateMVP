/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses and proper logging
 */

/**
 * Custom error classes for different error types
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

/**
 * Handle MongoDB-specific errors
 */
const handleMongoError = (err) => {
  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return new ConflictError(`${field} already exists`);
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return new ValidationError(messages.join(', '));
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return new ValidationError(`Invalid ${err.path}: ${err.value}`);
  }

  return null;
};

/**
 * Development error response (includes stack trace)
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    error: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    details: err
  });
};

/**
 * Production error response (sanitized)
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.retryAfter && { retryAfter: err.retryAfter })
    });
  } else {
    // Programming or unknown error: don't leak error details
    console.error('💥 UNEXPECTED ERROR:', err);
    res.status(500).json({
      error: 'Something went wrong. Please try again later.'
    });
  }
};

/**
 * Main error handling middleware
 * Must be defined AFTER all routes
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.isOperational = err.isOperational !== undefined ? err.isOperational : false;

  // Log error for debugging
  console.error(`[${err.statusCode}] ${err.message}`);
  if (err.statusCode === 500) {
    console.error(err.stack);
  }

  // Handle MongoDB-specific errors
  const mongoError = handleMongoError(err);
  if (mongoError) {
    err = mongoError;
  }

  // Send appropriate response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

/**
 * Catch-all for 404 errors (unmatched routes)
 */
const notFoundHandler = (req, res, next) => {
  const err = new NotFoundError(`Route ${req.originalUrl}`);
  next(err);
};

/**
 * Async error wrapper - catches errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (err) => {
  console.error('💥 UNHANDLED REJECTION:', err);
  // In production, you might want to gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    console.error('Shutting down gracefully...');
    process.exit(1);
  }
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
  // Must exit process - app is in undefined state
  console.error('Shutting down...');
  process.exit(1);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  // Export error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
};
