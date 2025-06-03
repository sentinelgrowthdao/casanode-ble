import { isValidIP } from '../src/utils/validators';

describe('isValidIP', () => {
  test('valid IPv4 returns true', () => {
    expect(isValidIP('192.168.0.1')).toBe(true);
  });

  test('invalid IP returns false', () => {
    expect(isValidIP('999.999.999.999')).toBe(false);
  });
});
