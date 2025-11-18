import { useState, useCallback, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { PasswordStrength, validatePassword } from "@/components/ui/password-strength";
import { OnboardingModal } from "./OnboardingModal";
import { navigate, Routes } from "@/lib/services/navigation.service";

interface RegisterFormProps {
  initialError?: string | null;
}

export function RegisterForm({ initialError = null }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();

  // Validation
  const isNameValid = name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = validatePassword(password);
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const canSubmit = isNameValid && isEmailValid && isPasswordValid && doPasswordsMatch && !isSubmitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!canSubmit) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Wystąpił błąd podczas rejestracji");
          setIsSubmitting(false);
          return;
        }

        // After successful registration, show onboarding modal
        // New users always need onboarding
        setShowOnboarding(true);
      } catch {
        setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
        setIsSubmitting(false);
      }
    },
    [canSubmit, name, email, password]
  );

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setError(null);
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    // After onboarding is complete, close modal and redirect
    setShowOnboarding(false);
    // Delay to ensure session cookies are fully processed by browser
    await navigate(Routes.notes.list(), { delay: 500 });
  }, []);

  return (
    <>
      <OnboardingModal isOpen={showOnboarding} onComplete={handleOnboardingComplete} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Utwórz konto</h2>
          <p className="text-sm text-muted-foreground">Dołącz do VibeTravels i zacznij planować swoje podróże</p>
        </div>

        {error && <FormError message={error} id={errorId} />}

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor={nameId}>Imię</Label>
            <Input
              id={nameId}
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Jan Kowalski"
              aria-invalid={!isNameValid && name.length > 0}
              aria-describedby={!isNameValid && name.length > 0 ? `${nameId}-error` : undefined}
              disabled={isSubmitting}
              autoComplete="name"
              required
            />
            {!isNameValid && name.length > 0 && (
              <p id={`${nameId}-error`} className="text-sm text-muted-foreground">
                Imię musi mieć co najmniej 2 znaki
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="jan@example.com"
              aria-invalid={!isEmailValid && email.length > 0}
              aria-describedby={!isEmailValid && email.length > 0 ? `${emailId}-error` : undefined}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
            {!isEmailValid && email.length > 0 && (
              <p id={`${emailId}-error`} className="text-sm text-muted-foreground">
                Wprowadź poprawny adres email
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor={passwordId}>Hasło</Label>
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
          {isSubmitting ? "Tworzenie konta..." : "Zarejestruj się"}
        </Button>
      </form>
    </>
  );
}
