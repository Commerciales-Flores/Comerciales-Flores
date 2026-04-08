import { CheckCircle2 } from 'lucide-react';
import { getPasswordStrength } from '../../utils/passwordStrength';

type PasswordStrengthIndicatorProps = {
  password: string;
  confirmPassword?: string;
  showChecklist?: boolean;
  showMatchStatus?: boolean;
  compact?: boolean;
};

export default function PasswordStrengthIndicator({
  password,
  confirmPassword = '',
  showChecklist = true,
  showMatchStatus = false,
  compact = false,
}: PasswordStrengthIndicatorProps) {
  if (!password && !confirmPassword) return null;

  const { score, label, checks } = getPasswordStrength(password);

  const strengthColor =
    label === 'Strong'
      ? 'text-emerald-500'
      : label === 'Medium'
        ? 'text-amber-500'
        : 'text-rose-500';

  const filledBarClass =
    score <= 2 ? 'bg-rose-500' : score === 3 ? 'bg-amber-500' : 'bg-emerald-500';

  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  return (
    <div className={compact ? 'mt-2 space-y-2' : 'mt-2 space-y-3'}>
      {password && (
        <>
          <div className="flex gap-1 h-1">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-full flex-1 rounded-full transition-all duration-500 ${
                  score >= step ? filledBarClass : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <p className={`text-[10px] font-bold uppercase tracking-widest ${strengthColor}`}>
            Security: {label}
          </p>

          {showChecklist && (
            <div className="grid grid-cols-1 gap-1">
              {[
                { ok: checks.minLength, text: 'At least 8 characters' },
                { ok: checks.uppercase, text: 'One uppercase letter' },
                { ok: checks.number, text: 'One number' },
                { ok: checks.specialChar, text: 'One special character' },
              ].map((item) => (
                <div
                  key={item.text}
                  className={`flex items-center gap-2 text-xs font-medium ${
                    item.ok ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="size-3.5 flex-shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showMatchStatus && confirmPassword && (
        <p
          className={`text-[10px] font-bold uppercase tracking-widest ${
            passwordsMatch ? 'text-emerald-500' : 'text-rose-500'
          }`}
        >
          {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
        </p>
      )}
    </div>
  );
}