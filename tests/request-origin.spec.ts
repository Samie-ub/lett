import { test, expect } from '@playwright/test';
import { isAllowedOrigin } from '../lib/request-origin';

test('origin check uses the public host instead of the internal bind address', () => {
  for (const host of ['localhost:3000', '127.0.0.1:3000', '192.168.1.10:3000', '[::1]:3000']) {
    expect(
      isAllowedOrigin(
        new Request('http://0.0.0.0:3000/api/assistant', {
          headers: { host, origin: `http://${host}` },
        }),
      ),
    ).toBe(true);
  }
});

test('origin check supports a forwarded HTTPS host', () => {
  expect(
    isAllowedOrigin(
      new Request('http://0.0.0.0:3000/api/assistant', {
        headers: {
          host: 'internal:3000',
          origin: 'https://learn.example.com',
          'x-forwarded-host': 'learn.example.com',
          'x-forwarded-proto': 'https',
        },
      }),
    ),
  ).toBe(true);
});

test('origin check rejects foreign origins, wrong ports, protocols, and malformed origins', () => {
  for (const origin of [
    'https://untrusted.example',
    'http://localhost:4000',
    'https://localhost:3000',
    'null',
    'invalid',
    'http://localhost:3000/path',
  ]) {
    expect(
      isAllowedOrigin(
        new Request('http://0.0.0.0:3000/api/assistant', {
          headers: { host: 'localhost:3000', origin },
        }),
      ),
    ).toBe(false);
  }
  expect(
    isAllowedOrigin(
      new Request('http://localhost:3000/api/assistant', {
        headers: { origin: 'http://localhost:3000', 'sec-fetch-site': 'cross-site' },
      }),
    ),
  ).toBe(false);
});
