import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';

function context(method: string, origin?: string): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ method, headers: { origin } }),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  const guard = new CsrfGuard(reflector);

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = originalCorsOrigin;
    jest.clearAllMocks();
  });

  it('accepts local browser origins in development, matching CORS', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGIN = 'http://localhost:5173';

    expect(guard.canActivate(context('POST', 'http://127.0.0.1:5173'))).toBe(
      true,
    );
  });

  it('rejects unconfigured origins in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://app.example.com';

    expect(() =>
      guard.canActivate(context('POST', 'http://127.0.0.1:5173')),
    ).toThrow(ForbiddenException);
  });

  it('continues to reject unsafe requests without an origin', () => {
    process.env.NODE_ENV = 'development';

    expect(() => guard.canActivate(context('POST'))).toThrow(
      ForbiddenException,
    );
  });
});
