import { getAllowedOrigins } from './origins';

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
