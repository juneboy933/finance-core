import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IdempotencyInterceptor } from './idempotency.interceptor';

describe('IdempotencyInterceptor', () => {
  it('should be defined', () => {
    assert.ok(new IdempotencyInterceptor());
  });
});
