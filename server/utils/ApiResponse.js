/**
 * Ensures every successful API response follows the same envelope:
 * { success, message, data }
 */
class ApiResponse {
  constructor(statusCode, message = "Operation successful", data = {}) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

export default ApiResponse;