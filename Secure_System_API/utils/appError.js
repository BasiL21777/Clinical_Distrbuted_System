// utils/appError.js
class AppError extends Error {
  constructor(message, statusCode, statusText) {
    super(message);
    this.statusCode = statusCode;
    this.statusText = statusText || 'error';
  }
}

module.exports = {
  create(message, statusCode, statusText) {
    return new AppError(message, statusCode, statusText);
  }
};
