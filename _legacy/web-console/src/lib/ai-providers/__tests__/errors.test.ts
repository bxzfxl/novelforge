import { describe, it, expect } from 'vitest';
import {
  OperationNotConfiguredError,
  ProviderAPIError,
  classifyError,
} from '../errors';

describe('error classes', () => {
  it('OperationNotConfiguredError carries operationId', () => {
    const err = new OperationNotConfiguredError('writer.main');
    expect(err.operationId).toBe('writer.main');
    expect(err.message).toContain('writer.main');
  });

  it('ProviderAPIError carries status', () => {
    const err = new ProviderAPIError('anthropic', 429, 'rate limit');
    expect(err.provider).toBe('anthropic');
    expect(err.status).toBe(429);
  });
});

describe('classifyError', () => {
  it('429 is transient', () => {
    expect(classifyError(new ProviderAPIError('anthropic', 429, 'rate'))).toBe('transient');
  });

  it('500 is transient', () => {
    expect(classifyError(new ProviderAPIError('anthropic', 500, 'err'))).toBe('transient');
  });

  it('401 is permanent', () => {
    expect(classifyError(new ProviderAPIError('anthropic', 401, 'unauth'))).toBe('permanent');
  });

  it('404 is permanent', () => {
    expect(classifyError(new ProviderAPIError('anthropic', 404, 'nope'))).toBe('permanent');
  });

  it('network error (null status) is transient', () => {
    expect(classifyError(new ProviderAPIError('anthropic', null, 'econnreset'))).toBe('transient');
  });

  it('timeout message is transient', () => {
    expect(classifyError(new Error('request timeout'))).toBe('transient');
  });

  it('unknown is unknown', () => {
    expect(classifyError(new Error('something weird'))).toBe('unknown');
  });
});
