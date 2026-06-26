export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
  get isAuth() { return this.status === 401 || this.status === 403 }
}
