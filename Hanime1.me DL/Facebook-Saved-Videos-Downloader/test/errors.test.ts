import { describe, expect, it } from 'vitest';
import {
  FbSavedCliError,
  AUTH_FAILED,
  COOKIES_INVALID,
  YT_DLP_FAILED,
  FETCH_GRAPHQL,
  PAGINATION_LOOP,
  NO_VIDEOS,
  EXIT_OK,
  EXIT_PARTIAL,
  EXIT_FATAL,
  EXIT_NOTHING,
  exitCodeFor,
} from '../src/errors.js';

describe('FbSavedCliError', () => {
  it('is an Error with a code property', () => {
    const err = new FbSavedCliError(AUTH_FAILED, 'auth failed');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FbSavedCliError);
    expect(err.code).toBe(AUTH_FAILED);
    expect(err.message).toBe('auth failed');
  });
});

describe('exitCodeFor', () => {
  it.each([
    [AUTH_FAILED, EXIT_FATAL],
    [COOKIES_INVALID, EXIT_FATAL],
    [YT_DLP_FAILED, EXIT_PARTIAL],
    [FETCH_GRAPHQL, EXIT_PARTIAL],
    [PAGINATION_LOOP, EXIT_PARTIAL],
    [NO_VIDEOS, EXIT_NOTHING],
  ])('maps %s -> %d', (code, expected) => {
    expect(exitCodeFor(code)).toBe(expected);
  });

  it('defaults unknown codes to EXIT_PARTIAL', () => {
    expect(exitCodeFor('UNKNOWN_CODE')).toBe(EXIT_PARTIAL);
  });

  it('exposes EXIT_OK as 0', () => {
    expect(EXIT_OK).toBe(0);
  });
});
