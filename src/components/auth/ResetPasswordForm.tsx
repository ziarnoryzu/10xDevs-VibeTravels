import { useState, useCallback, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { PasswordStrength, validatePassword } from "@/components/ui/password-strength";
import { navigate, buildUrl } from "@/lib/services/navigation.service";

interface ResetPasswordFormProps {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
}

export function ResetPasswordForm({ code, tokenHash, type }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();

  const isPasswordValid = validatePassword(password);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const canSubmit = isPasswordValid && doPasswordsMatch && !isSubmitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!canSubmit) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            tokenHash,
            type,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Wystąpił błąd podczas zmiany hasła");
          setIsSubmitting(false);
          return;
        }

        // Redirect to login with success message
        await navigate(buildUrl("/auth/login", { success: "password-reset" }));
      } catch {
        setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
        setIsSubmitting(false);
      }
    },
    [canSubmit, code, tokenHash, type, password]
  );

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setError(null);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Ustaw nowe hasło</h2>
        <p className="text-sm text-muted-foreground">
          Wprowadź nowe hasło dla swojego konta. Upewnij się, że spełnia wszystkie wymagania bezpieczeństwa.
        </p>
      </div>

      {error && <FormError message={error} id={errorId} />}

      <div className="space-y-4">
        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor={passwordId}>Nowe hasło</Label>
          <Input
            id={passwordId}
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="••••••••"
            aria-invalid={!isPasswordValid && password.length > 0}
            disabled={isSubmitting}
            autoComplete="new-password"
            required
          />
          <PasswordStrength password={password} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor={confirmPasswordId}>Potwierdź hasło</Label>
          <Input
            id={confirmPasswordId}
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="••••••••"
            aria-invalid={!doPasswordsMatch && confirmPassword.length > 0}
            aria-describedby={
              !doPasswordsMatch && confirmPassword.length > 0 ? `${confirmPasswordId}-error` : undefined
            }
            disabled={isSubmitting}
            autoComplete="new-password"
            required
          />
          {!doPasswordsMatch && confirmPassword.length > 0 && (
            <p id={`${confirmPasswordId}-error`} className="text-sm text-destructive">
              Hasła nie są identyczne
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {isSubmitting ? "Zapisywanie..." : "Ustaw nowe hasło"}
      </Button>
    </form>
  );
}
