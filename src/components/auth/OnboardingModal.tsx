import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProfilePreferencesForm } from "@/components/profile/ProfilePreferencesForm";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

/**
 * OnboardingModal - shown to new users after first login
 * Encourages them to set travel preferences but allows skipping
 */
export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);

  const handleSavePreferences = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profiles/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferences: selectedPreferences }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Nie udało się zapisać preferencji");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
      setIsSubmitting(false);
    }
  }, [onComplete, selectedPreferences]);

  const handleSkip = useCallback(() => {
    // Complete onboarding without saving preferences
    // The parent component (LoginForm) will handle the delay before redirect
    onComplete();
  }, [onComplete]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      setSelectedPreferences([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={() => undefined} modal>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Witaj w VibeTravels! ✈️</DialogTitle>
          <DialogDescription>
            Pomóż nam poznać Twoje zainteresowania, aby tworzyć lepsze plany podróży
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {error && (
            <div
              className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          <ProfilePreferencesForm
            initialPreferences={[]}
            onSubmit={handleSavePreferences}
            submitLabel="Zapisz i kontynuuj"
            isSubmitting={isSubmitting}
            hideActions
            onPreferencesChange={setSelectedPreferences}
          />
        </div>

        {/* Sticky footer with actions */}
        <div className="flex-shrink-0 pt-4 border-t space-y-3">
          <Button
            type="button"
            onClick={handleSavePreferences}
            disabled={isSubmitting || selectedPreferences.length === 0}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz i kontynuuj"}
          </Button>
          <Button type="button" variant="ghost" onClick={handleSkip} disabled={isSubmitting} className="w-full">
            Pomiń, uzupełnię później
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
