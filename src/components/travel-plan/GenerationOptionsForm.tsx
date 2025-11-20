import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GenerationOptions, TravelPlanDTO } from "@/types";

interface GenerationOptionsFormProps {
  existingPlan: TravelPlanDTO | null;
  isSubmitting: boolean;
  onSubmit: (options: GenerationOptions) => void;
}

/**
 * GenerationOptionsForm allows users to customize travel plan generation.
 * Collects style, transport, and budget preferences.
 * Requires confirmation checkbox if overwriting an existing plan.
 */
export function GenerationOptionsForm({ existingPlan, isSubmitting, onSubmit }: GenerationOptionsFormProps) {
  const [style, setStyle] = useState<GenerationOptions["style"] | "">("");
  const [transport, setTransport] = useState<GenerationOptions["transport"] | "">("");
  const [budget, setBudget] = useState<GenerationOptions["budget"] | "">("");
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Reset confirmation when existingPlan changes
  useEffect(() => {
    if (!existingPlan) {
      setConfirmOverwrite(false);
    }
  }, [existingPlan]);

  // Validate form completeness
  const isFormValid = (): boolean => {
    // All fields must be filled
    if (!style || !transport || !budget) {
      return false;
    }

    // If overwriting existing plan, confirmation must be checked
    if (existingPlan && !confirmOverwrite) {
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid() || isSubmitting) {
      return;
    }

    // Type assertion is safe here because isFormValid ensures all fields are filled
    onSubmit({
      style: style as GenerationOptions["style"],
      transport: transport as GenerationOptions["transport"],
      budget: budget as GenerationOptions["budget"],
    });
  };

  const isButtonDisabled = !isFormValid() || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalizuj swój plan podróży</h3>
          <p className="text-sm text-gray-600">
            Wybierz preferencje, aby wygenerować plan idealnie dopasowany do Twoich potrzeb.
          </p>
        </div>

        {/* Warning if overwriting existing plan */}
        {existingPlan && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 mb-1">Istniejący plan zostanie nadpisany</h4>
                <p className="text-sm text-amber-700">
                  Dla tej notatki istnieje już wygenerowany plan. Wygenerowanie nowego planu spowoduje nadpisanie
                  poprzedniego.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Style selection */}
        <div className="space-y-2">
          <Label htmlFor="style" className="text-sm font-medium text-gray-900">
            Styl podróży
          </Label>
          <Select value={style} onValueChange={(value) => setStyle(value as GenerationOptions["style"])}>
            <SelectTrigger id="style" className="w-full">
              <SelectValue placeholder="Wybierz styl podróży" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="adventure">Przygoda - aktywny wypoczynek i wyzwania</SelectItem>
              <SelectItem value="leisure">Relaks - spokojne zwiedzanie i odpoczynek</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transport selection */}
        <div className="space-y-2">
          <Label htmlFor="transport" className="text-sm font-medium text-gray-900">
            Preferowany transport
          </Label>
          <Select value={transport} onValueChange={(value) => setTransport(value as GenerationOptions["transport"])}>
            <SelectTrigger id="transport" className="w-full">
              <SelectValue placeholder="Wybierz rodzaj transportu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="car">Samochód - swoboda przemieszczania się</SelectItem>
              <SelectItem value="public">Transport publiczny - ekologicznie i ekonomicznie</SelectItem>
              <SelectItem value="walking">Pieszo - maksymalne zanurzenie w miejscu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Budget selection */}
        <div className="space-y-2">
          <Label htmlFor="budget" className="text-sm font-medium text-gray-900">
            Budżet
          </Label>
          <Select value={budget} onValueChange={(value) => setBudget(value as GenerationOptions["budget"])}>
            <SelectTrigger id="budget" className="w-full">
              <SelectValue placeholder="Wybierz poziom budżetu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Ekonomiczny - tanie opcje i oszczędności</SelectItem>
              <SelectItem value="standard">Standard - umiarkowane ceny i komfort</SelectItem>
              <SelectItem value="luxury">Luksus - najwyższa jakość bez ograniczeń</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confirmation checkbox for overwriting existing plan */}
        {existingPlan && (
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="confirm-overwrite"
              checked={confirmOverwrite}
              onCheckedChange={(checked) => setConfirmOverwrite(checked === true)}
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <Label
                htmlFor="confirm-overwrite"
                className="text-sm font-medium text-gray-900 cursor-pointer leading-relaxed"
              >
                Potwierdzam, że chcę nadpisać istniejący plan podróży
              </Label>
              <p className="text-xs text-gray-600 mt-1">
                Ta akcja jest nieodwracalna. Poprzedni plan zostanie trwale zastąpiony nowym.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed submit button at bottom */}
      <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-200">
        <Button type="submit" disabled={isButtonDisabled} className="w-full" size="lg">
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generowanie...
            </>
          ) : (
            "Generuj plan podróży"
          )}
        </Button>

        {/* Validation hint */}
        {!isFormValid() && !isSubmitting && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            {!style || !transport || !budget
              ? "Wypełnij wszystkie pola aby kontynuować"
              : existingPlan && !confirmOverwrite
                ? "Potwierdź nadpisanie istniejącego planu"
                : ""}
          </p>
        )}
      </div>
    </form>
  );
}
