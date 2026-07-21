import { PasswordHasher } from './password-hasher.service';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('creates a bcrypt hash with the requested cost and verifies it', async () => {
    const password = 'StrongP@ss1';
    const hash = await hasher.hash(password, 10);

    expect(hash).not.toBe(password);
    expect(hasher.cost(hash)).toBe(10);
    await expect(hasher.matches(password, hash)).resolves.toBe(true);
    await expect(hasher.matches('WrongP@ss1', hash)).resolves.toBe(false);
  });
});
