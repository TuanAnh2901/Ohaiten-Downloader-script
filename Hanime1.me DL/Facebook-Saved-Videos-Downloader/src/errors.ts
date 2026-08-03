// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const FETCH_GRAPHQL = 'FETCH_GRAPHQL';
export const AUTH_FAILED = 'AUTH_FAILED';
export const YT_DLP_FAILED = 'YT_DLP_FAILED';
export const COOKIES_INVALID = 'COOKIES_INVALID';
export const NO_VIDEOS = 'NO_VIDEOS';
export const PAGINATION_LOOP = 'PAGINATION_LOOP';

// ---------------------------------------------------------------------------
// Exit codes
// ---------------------------------------------------------------------------

export const EXIT_OK = 0;
export const EXIT_PARTIAL = 1;
export const EXIT_FATAL = 2;
export const EXIT_NOTHING = 3;

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class FbSavedCliError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'FbSavedCliError';
  }
}

// ---------------------------------------------------------------------------
// Exit code mapping
// ---------------------------------------------------------------------------

export function exitCodeFor(code: string): number {
  switch (code) {
    case AUTH_FAILED:
    case COOKIES_INVALID:
      return EXIT_FATAL;
    case YT_DLP_FAILED:
    case FETCH_GRAPHQL:
    case PAGINATION_LOOP:
      return EXIT_PARTIAL;
    case NO_VIDEOS:
      return EXIT_NOTHING;
    default:
      return EXIT_PARTIAL;
  }
}
