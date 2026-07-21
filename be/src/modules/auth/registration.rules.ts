import { isEmail } from 'class-validator';

export interface RegistrationInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const FULL_NAME_PATTERN = /^\p{L}+(?: \p{L}+)*$/u;
export const PASSWORD_ALLOWED_PATTERN =
  /^[A-Za-z0-9!@#$%^&*(){}_+=[\],./<>?\\|:;-]+$/;
export const PASSWORD_SPECIAL_PATTERN = /[!@#$%^&*(){}_+=[\],./<>?\\|:;-]/;

export const normalizeFullName = (value: string): string =>
  value.normalize('NFC').trim();

export const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

export const normalizeRegisterDto = (
  dto: RegistrationInput,
): RegistrationInput => ({
  fullName:
    typeof dto.fullName === 'string'
      ? normalizeFullName(dto.fullName)
      : dto.fullName,
  email: typeof dto.email === 'string' ? normalizeEmail(dto.email) : dto.email,
  password: dto.password,
  confirmPassword: dto.confirmPassword,
});

export const isStructurallyValidRegistration = (
  dto: RegistrationInput,
): boolean => {
  if (
    typeof dto.fullName !== 'string' ||
    typeof dto.email !== 'string' ||
    typeof dto.password !== 'string' ||
    typeof dto.confirmPassword !== 'string'
  ) {
    return false;
  }

  const normalizedName = normalizeFullName(dto.fullName);
  const normalizedEmail = normalizeEmail(dto.email);
  const password = dto.password;

  return (
    normalizedName.length >= 4 &&
    normalizedName.length <= 25 &&
    FULL_NAME_PATTERN.test(normalizedName) &&
    normalizedEmail.length > 0 &&
    normalizedEmail.length <= 255 &&
    isEmail(normalizedEmail) &&
    password.length >= 8 &&
    password.length <= 64 &&
    !/\s/.test(password) &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    PASSWORD_SPECIAL_PATTERN.test(password) &&
    PASSWORD_ALLOWED_PATTERN.test(password) &&
    dto.confirmPassword === password &&
    password.toLowerCase() !== normalizedEmail &&
    password.toLowerCase() !== normalizedEmail.split('@')[0]
  );
};
