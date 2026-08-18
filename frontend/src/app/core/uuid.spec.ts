import { createUuid } from './uuid';

describe('createUuid', () => {
  it('uses the native UUID generator in secure contexts', () => {
    const nativeUuid = '11111111-2222-4333-8444-555555555555';
    const cryptoSource = {
      randomUUID: () => nativeUuid,
    } as unknown as Crypto;

    expect(createUuid(cryptoSource)).toBe(nativeUuid);
  });

  it('creates a valid version 4 UUID when randomUUID is unavailable', () => {
    const cryptoSource = {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.forEach((_, index) => (bytes[index] = index));
        return bytes;
      },
    } as unknown as Crypto;

    expect(createUuid(cryptoSource)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
