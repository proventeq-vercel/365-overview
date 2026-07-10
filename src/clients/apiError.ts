export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
  get isAuth() { return this.status === 401 || this.status === 403 }
}
