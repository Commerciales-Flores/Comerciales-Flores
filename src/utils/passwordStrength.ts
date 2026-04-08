export type PasswordStrengthLabel = 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | '';

export type PasswordStrengthResult = {
  score: number;
  label: PasswordStrengthLabel;
  checks: {
    minLength: boolean;
    uppercase: boolean;
    number: boolean;
    specialChar: boolean;
  };
};

export function getPasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label: PasswordStrengthLabel = '';
  if (!password) {
    label = '';
  } else if (score <= 1) {
    label = 'Very Weak';
  } else if (score === 2) {
    label = 'Weak';
  } else if (score === 3) {
    label = 'Medium';
  } else {
    label = 'Strong';
  }

  return { score, label, checks };
}

export function isPasswordPolicyValid(password: string) {
  const result = getPasswordStrength(password);
  return (
    result.checks.minLength &&
    result.checks.uppercase &&
    result.checks.number &&
    result.checks.specialChar
  );
}