export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function dependencyError(dependency: string, cause: unknown): ApiError {
  const message = cause instanceof Error ? cause.message : String(cause);
  return new ApiError(503, "dependency_unavailable", `${dependency} is unavailable`, {
    dependency,
    cause: message,
  });
}

