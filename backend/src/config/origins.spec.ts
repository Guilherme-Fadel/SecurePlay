import { getAllowedOrigins, isDevEnvironment, isLocalOrigin } from './origins';

describe('isLocalOrigin', () => {
  it('accepts localhost and 127.0.0.1 on any port', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true);
    expect(isLocalOrigin('http://localhost:5174')).toBe(true);
    expect(isLocalOrigin('http://127.0.0.1:5174')).toBe(true);
    expect(isLocalOrigin('https://localhost')).toBe(true);
  });

  it('rejects non-local origins', () => {
    expect(isLocalOrigin('https://app.example.com')).toBe(false);
    expect(isLocalOrigin('http://localhost.evil.com')).toBe(false);
    expect(isLocalOrigin(undefined)).toBe(false);
  });
});

describe('isDevEnvironment', () => {
  it('is false only when NODE_ENV is production', () => {
    expect(isDevEnvironment('production')).toBe(false);
    expect(isDevEnvironment('development')).toBe(true);
    expect(isDevEnvironment(undefined)).toBe(true);
  });
});

describe('getAllowedOrigins', () => {
  it('uses the local frontend when no origin is configured', () => {
    expect(getAllowedOrigins(undefined)).toEqual(['http://localhost:5173']);
  });

  it('accepts multiple comma-separated origins', () => {
    expect(
      getAllowedOrigins('https://app.example.com, https://admin.example.com'),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });
});
