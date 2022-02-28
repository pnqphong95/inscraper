export class ApiError extends Error {

  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.status = status;
  }

  json() {
    const message = this.message;
    const status = this.status;
    return { status, message }
  }

}