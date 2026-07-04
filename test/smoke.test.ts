import { describe, it, expect } from 'vitest';
import program from '../src/index.ts';

describe('animehay-cli', () => {
  it('should export a Command instance', () => {
    expect(program).toBeDefined();
    expect(typeof program).toBe('object');
    expect(program.name).toBeDefined();
    expect(typeof program.name).toBe('function');
  });
});
