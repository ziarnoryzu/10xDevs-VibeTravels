import { useState, useCallback, useId, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { OnboardingModal } from "@/components/auth/OnboardingModal";
import { navigate } from "@/lib/services/navigation.service";
import type { LoginResponseDTO } from "@/types/auth.types";

interface LoginFormProps {
  redirectTo?: string;
  successMessage?: string | null;
}

export function LoginForm({ redirectTo = "/app/notes", successMessage = null }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasValues, setHasValues] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  // Check if form has values (including autofill)
  useEffect(() => {
    const checkValues = () => {
      const emailValue = emailInputRef.current?.value || "";
      const passwordValue = passwordInputRef.current?.value || "";
      setHasValues(emailValue.length > 0 && passwordValue.length > 0);
    };

    // Check immediately and with delays to catch autofill
    checkValues();
    const timeoutId1 = setTimeout(checkValues, 100);
    const timeoutId2 = setTimeout(checkValues, 300);
    const timeoutId3 = setTimeout(checkValues, 500);

    // Listen for autofill events
    const emailInput = emailInputRef.current;
    const passwordInput = passwordInputRef.current;

    const handleAnimationStart = (e: AnimationEvent) => {
      if (e.animationName === "mui-auto-fill" || e.animationName === "onAutoFillStart") {
        checkValues();
      }
    };

    emailInput?.addEventListener("animationstart", handleAnimationStart as EventListener);
    passwordInput?.addEventListener("animationstart", handleAnimationStart as EventListener);

    // Also listen for input events
    emailInput?.addEventListener("input", checkValues);
    passwordInput?.addEventListener("input", checkValues);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      emailInput?.removeEventListener("animationstart", handleAnimationStart as EventListener);
      passwordInput?.removeEventListener("animationstart", handleAnimationStart as EventListener);
      emailInput?.removeEventListener("input", checkValues);
      passwordInput?.removeEventListener("input", checkValues);
    };
  }, []);

  const canSubmit = hasValues && !isSubmitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Check values one more time before submit
      const formData = new FormData(e.currentTarget);
      const emailValue = (formData.get("email") as string)?.trim() || "";
      const passwordValue = (formData.get("password") as string) || "";

      if (!emailValue || !passwordValue || isSubmitting) return;

      // Client-side email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        setError("Nieprawidłowy format adresu email");
        return;
      }

      setError(null);
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: emailValue,
            password: passwordValue,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.message || "Nieprawidłowy email lub hasło");
          setIsSubmitting(false);
          return;
        }

        const data: LoginResponseDTO = await response.json();

        // Check if user needs onboarding
        if (data.needsOnboarding) {
          // Show onboarding modal
          setShowOnboarding(true);
          setIsSubmitting(false);
        } else {
          // Redirect to target page
          await navigate(redirectTo);
        }
      } catch {
        setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
        setIsSubmitting(false);
      }
    },
    [redirectTo, isSubmitting]
  );

  const handleOnboardingComplete = useCallback(async () => {
    // After onboarding is complete, close modal and redirect
    setShowOnboarding(false);
    // Delay to ensure session cookies are fully processed by browser
    await navigate(redirectTo, { delay: 500 });
  }, [redirectTo]);

  const handleButtonMouseEnter = useCallback(() => {
    // Last chance to check values when hovering over submit button
    const emailValue = emailInputRef.current?.value || "";
    const passwordValue = passwordInputRef.current?.value || "";
    setHasValues(emailValue.length > 0 && passwordValue.length > 0);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Zaloguj się</h2>
        <p className="text-sm text-muted-foreground">Wpisz swoje dane, aby kontynuować</p>
      </div>

      {successMessage && <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">{successMessage}</div>}

      {error && <FormError message={error} id={errorId} />}

      <div className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor={emailId}>Email</Label>
          <Input
            ref={emailInputRef}
            id={emailId}
            name="email"
            type="email"
            placeholder="jan@example.com"
            disabled={isSubmitting}
            autoComplete="email"
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={passwordId}>Hasło</Label>
            <a
              href="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
              tabIndex={isSubmitting ? -1 : 0}
            >
              Zapomniałeś hasła?
            </a>
          </div>
          <Input
            ref={passwordInputRef}
            id={passwordId}
            name="password"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        onMouseEnter={handleButtonMouseEnter}
        onFocus={handleButtonMouseEnter}
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
      >
        {isSubmitting ? "Logowanie..." : "Zaloguj się"}
      </Button>

      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
    </form>
  );
}
