/* agent-frontmatter:start
AGENT: Smart error handling system with auto-fix suggestions
Automatically identifies errors and provides fix commands
agent-frontmatter:end */

// Standard error class with fix suggestions
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public fix?: string,
    public prompt?: string,
    public statusCode = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Error pattern definitions
export interface ErrorPattern {
  pattern: RegExp;
  code: string;
  message: string;
  fix: string;
  prompt: string;
  statusCode?: number;
}

// Common error patterns with auto-fix commands
export const errorPatterns: ErrorPattern[] = [
  // Database errors
  {
    pattern: /ECONNREFUSED.*5432/,
    code: "DB_CONNECTION_FAILED",
    message: "Database connection failed",
    fix: "bun db:push",
    prompt:
      "Database connection failed. Please run:\nbun db:push\n\nIf the problem persists, check that POSTGRES_URL is correctly configured in .env",
    statusCode: 503,
  },
  {
    pattern: /relation.*does not exist/,
    code: "DB_SCHEMA_OUT_OF_SYNC",
    message: "Database schema is out of sync",
    fix: "bun db:push",
    prompt:
      "Database schema is outdated. Please run:\nbun db:push\n\nOr use 'bun db:migrate' for migrations",
    statusCode: 500,
  },
  {
    pattern: /duplicate key value violates unique constraint/,
    code: "DB_UNIQUE_VIOLATION",
    message: "Duplicate entry detected",
    fix: "Check for existing records before inserting",
    prompt:
      "A record with this value already exists. Please use a different value or update the existing record.",
    statusCode: 409,
  },

  // Auth errors
  {
    pattern: /AUTH_SECRET.*undefined|not defined/,
    code: "AUTH_SECRET_MISSING",
    message: "Authentication secret is missing",
    fix: "openssl rand -base64 32 >> .env && echo 'AUTH_SECRET added to .env'",
    prompt:
      "Missing authentication secret. Please run:\nopenssl rand -base64 32 >> .env\n\nThen restart the development server",
    statusCode: 500,
  },
  {
    pattern: /Invalid credentials|Authentication failed/,
    code: "AUTH_FAILED",
    message: "Authentication failed",
    fix: "Verify email and password are correct",
    prompt:
      "Invalid email or password. Please check your credentials and try again.",
    statusCode: 401,
  },
  {
    pattern: /Unauthorized|Not authenticated/,
    code: "AUTH_REQUIRED",
    message: "Authentication required",
    fix: "Sign in to access this resource",
    prompt:
      "You must be signed in to access this resource. Please sign in and try again.",
    statusCode: 401,
  },

  // Environment errors
  {
    pattern: /Cannot find module.*\.env/,
    code: "ENV_FILE_MISSING",
    message: "Environment file not found",
    fix: "cp .env.example .env",
    prompt:
      "Environment file is missing. Please run:\ncp .env.example .env\n\nThen configure your environment variables",
    statusCode: 500,
  },
  {
    pattern: /POSTGRES_URL.*undefined/,
    code: "DATABASE_URL_MISSING",
    message: "Database URL not configured",
    fix: "Add POSTGRES_URL to .env file",
    prompt:
      "Database URL is missing. Please add POSTGRES_URL to your .env file.\n\nExample:\nPOSTGRES_URL=postgres://user:pass@localhost:5432/dbname",
    statusCode: 500,
  },

  // Module errors
  {
    pattern: /Cannot find module|Module not found/,
    code: "MODULE_NOT_FOUND",
    message: "Required module not found",
    fix: "bun install",
    prompt:
      "Missing dependencies detected. Please run:\nbun install\n\nThis will install all required packages",
    statusCode: 500,
  },
  {
    pattern: /Cannot find package/,
    code: "PACKAGE_NOT_FOUND",
    message: "Package not found",
    fix: "bun install",
    prompt:
      "Package not found. Please run:\nbun install\n\nIf the problem persists, try:\nrm -rf node_modules && bun install",
    statusCode: 500,
  },

  // API errors
  {
    pattern: /fetch failed|NetworkError/,
    code: "NETWORK_ERROR",
    message: "Network request failed",
    fix: "Check internet connection and API endpoint",
    prompt:
      "Network request failed. Please check:\n1. Internet connection\n2. API endpoint is correct\n3. CORS settings if applicable",
    statusCode: 503,
  },
  {
    pattern: /rate limit|too many requests/i,
    code: "RATE_LIMITED",
    message: "Rate limit exceeded",
    fix: "Wait before retrying",
    prompt: "Too many requests. Please wait a moment before trying again.",
    statusCode: 429,
  },

  // Validation errors
  {
    pattern: /validation.*failed|invalid.*input/i,
    code: "VALIDATION_ERROR",
    message: "Input validation failed",
    fix: "Check input format and required fields",
    prompt:
      "Invalid input provided. Please check all required fields and formats.",
    statusCode: 400,
  },
];

// Main error handler function
export function handleError(error: unknown): never {
  // Extract error message
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  // Try to match known error patterns
  const matchedPattern = errorPatterns.find((p) =>
    p.pattern.test(errorMessage),
  );

  if (matchedPattern) {
    throw new AppError(
      matchedPattern.code,
      matchedPattern.message,
      matchedPattern.fix,
      matchedPattern.prompt,
      matchedPattern.statusCode,
    );
  }

  // If no pattern matches, throw generic error
  throw new AppError(
    "UNKNOWN_ERROR",
    errorMessage || "An unknown error occurred",
    undefined,
    `Unexpected error: ${errorMessage}\n\nPlease check the error details and consult the documentation.`,
    500,
  );
}

// Helper to format error for display
export function formatError(error: AppError): string {
  let output = `❌ Error: ${error.message}\n`;
  output += `   Code: ${error.code}\n`;

  if (error.fix) {
    output += `   Fix: ${error.fix}\n`;
  }

  if (error.prompt) {
    output += `\n💡 Solution:\n`;
    output += `${"─".repeat(40)}\n`;
    output += `${error.prompt}\n`;
    output += `${"─".repeat(40)}\n`;
  }

  return output;
}

// Helper to check if error is AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Common error factories for consistent error creation
export const errors = {
  unauthorized: () =>
    new AppError(
      "AUTH_REQUIRED",
      "Authentication required",
      "Sign in to continue",
      "You must be signed in to access this resource.",
      401,
    ),

  forbidden: () =>
    new AppError(
      "FORBIDDEN",
      "Access denied",
      "Check user permissions",
      "You don't have permission to access this resource.",
      403,
    ),

  notFound: (resource = "Resource") =>
    new AppError(
      "NOT_FOUND",
      `${resource} not found`,
      `Verify the ${resource.toLowerCase()} exists`,
      `The requested ${resource.toLowerCase()} could not be found.`,
      404,
    ),

  badRequest: (message = "Invalid request") =>
    new AppError(
      "BAD_REQUEST",
      message,
      "Check request parameters",
      "The request is invalid. Please check your input and try again.",
      400,
    ),

  serverError: (message = "Internal server error") =>
    new AppError(
      "SERVER_ERROR",
      message,
      "Check server logs",
      "An unexpected error occurred. Please try again later.",
      500,
    ),
} as const;

export class AgentStackError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AgentStackError";
  }
}
