class HttpError {
    constructor({ statusCode = 400, error = "Unauthorized Access" }) {
        this.statusCode = statusCode
        this.error = error
    }
}