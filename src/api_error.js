export class ApiError extends Error {

  constructor(message, status, data) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.status = status;
    this.data = data;
  }

  json() {
    const message = this.message;
    const status = this.status;
    return { status, message }
  }

}