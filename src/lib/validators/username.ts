const USERNAME_REGEX = /^[a-z0-9_]+$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(value);
}

