// src/lib/services/travel-plan.service.ts

import type { Json } from "../../db/database.types";
import type { TravelPlanOptions } from "../../types";
import { OpenRouterService } from "../openrouter.service";
import { TravelPlanContentSchema } from "../schemas/travel-plan.schema";

/**
 * Service responsible for generating travel plans from notes using AI
 */
export class TravelPlanService {
  private readonly model?: string;

  constructor() {
    // Use model from environment variable if provided
    // Otherwise OpenRouterService will use its default (claude-3.5-haiku)
    this.model = import.meta.env.OPENROUTER_MODEL;
  }

  /**
   * Creates OpenRouterService instance with optional runtime environment
   * @param runtimeEnv - Optional Cloudflare runtime environment variables
   */
  private createOpenRouterService(runtimeEnv?: Record<string, string | undefined>): OpenRouterService {
    return new OpenRouterService(runtimeEnv);
  }
  /**
   * Validates that the note content meets minimum requirements
   * @param content - The note content to validate
   * @returns true if valid, false otherwise
   */
  validateNoteContent(content: string | null): boolean {
    if (!content) {
      return false;
    }

    // Count words (split by whitespace and filter empty strings)
    const words = content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    return words.length >= 10;
  }

  /**
   * Generates a travel plan based on note content and optional personalization options
   * Uses OpenRouter AI to create a detailed, structured travel itinerary
   * @param noteContent - The content of the travel note
   * @param options - Optional personalization options (style, transport, budget)
   * @param userPreferences - Optional user preferences from profile (interests, cuisine, pace, etc.)
   * @param runtimeEnv - Optional Cloudflare runtime environment variables
   * @returns Generated travel plan as structured JSON
   */
  async generatePlan(
    noteContent: string,
    options?: TravelPlanOptions,
    userPreferences?: string[],
    runtimeEnv?: Record<string, string | undefined>
  ): Promise<Json> {
    // Create OpenRouter service with runtime environment support
    const openRouterService = this.createOpenRouterService(runtimeEnv);

    // Get model from runtime env (Cloudflare) or fall back to build-time env
    const model = runtimeEnv?.OPENROUTER_MODEL || this.model;

    // Extract options with defaults
    const style = options?.style || "leisure";
    const transport = options?.transport || "public";
    const budget = options?.budget || "standard";

    // Build system prompt that defines the AI's role and task
    const systemPrompt = `Jesteś ekspertem w planowaniu podróży i tworzeniu szczegółowych, spersonalizowanych planów wycieczek. 

Twoim zadaniem jest przeanalizowanie notatek użytkownika dotyczących podróży i utworzenie kompleksowego planu wycieczki.

WAŻNE - Wymagania dotyczące dat i numeracji dni:
- Jeśli notatka zawiera konkretne daty podróży (np. "od 15 do 18 listopada", "weekend 20-22 grudnia", "5-7 czerwca"):
  * KONIECZNIE wyodrębnij te daty i przypisz je do poszczególnych dni planu
  * Wypełnij pole "date" w formacie ISO (YYYY-MM-DD), np. "2025-11-15"
  * Wypełnij pole "dayOfWeek" po polsku: Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela
  * Zachowaj również numerację dni (day: 1, 2, 3, ...)
  
KRYTYCZNE - Logika wyboru roku (dziś jest ${new Date().toISOString().split("T")[0]}):
  * Jeśli rok JEST podany w notatce (np. "15 listopada 2025") → użyj tego roku
  * Jeśli rok NIE JEST podany:
    - Sprawdź czy data już minęła w bieżącym roku (${new Date().getFullYear()})
    - Jeśli data jeszcze nie minęła → użyj bieżącego roku (${new Date().getFullYear()})
    - Jeśli data już minęła → użyj następnego roku (${new Date().getFullYear() + 1})
  * Przykłady (dziś: 5 listopada 2025):
    - "15 listopada" → 2025-11-15 (nie minęło w 2025)
    - "20 grudnia" → 2025-12-20 (nie minęło w 2025)
    - "5 czerwca" → 2026-06-05 (minęło w 2025, więc następny rok)
    - "10 stycznia" → 2026-01-10 (minęło w 2025, więc następny rok)

- Jeśli notatka NIE zawiera konkretnych dat lub są nieprecyzyjne (np. "kiedyś w wakacje"):
  * Pomiń pola "date" i "dayOfWeek" (nie dodawaj ich wcale)
  * Użyj tylko numeracji dni (day: 1, 2, 3, ...)
  
- Przykłady dat w notatkach, które MUSISZ rozpoznać:
  * "15-18 listopada 2025" → 2025-11-15, 2025-11-16, 2025-11-17, 2025-11-18
  * "od 15.11 do 18.11" → 2025-11-15 do 2025-11-18 (listopad nie minął)
  * "weekend 20-22 grudnia" → 2025-12-20, 2025-12-21, 2025-12-22 (grudzień nie minął)
  * "Przylatuję 5 czerwca, wracam 12 czerwca" → 2026-06-05 do 2026-06-12 (czerwiec minął w 2025)
  * "3 dni od piątku 10 stycznia" → 2026-01-10, 2026-01-11, 2026-01-12 (styczeń minął w 2025)

Musisz wziąć pod uwagę następujące preferencje użytkownika:
- Styl: ${style === "adventure" ? "przygodowy (aktywne zwiedzanie, intensywny program)" : "wypoczynkowy (spokojne tempo, relaks)"}
- Transport: ${transport === "car" ? "samochód" : transport === "public" ? "komunikacja publiczna" : "piesze przemieszczanie się"}
- Budżet: ${budget === "economy" ? "ekonomiczny (tanie opcje)" : budget === "standard" ? "standardowy (średnie ceny)" : "luksusowy (premium opcje)"}${
      userPreferences && userPreferences.length > 0
        ? `

PREFERENCJE UŻYTKOWNIKA Z PROFILU:
${userPreferences.map((pref) => `• ${pref}`).join("\n")}

Uwzględnij te preferencje przy planowaniu - traktuj je jako ważne wskazówki, ale nie sztywne wymagania.
Staraj się, aby w całym planie pojawiła się przynajmniej jedna atrakcja lub restauracja dla każdej preferencji.

• Preferencje kulinarne (np. "włoska kuchnia", "japońska kuchnia"):
  - Zaproponuj kilka restauracji tego typu (niekoniecznie wszystkie posiłki)
  - W opisach wyraźnie zaznacz typ kuchni (np. "włoska restauracja", "pizzeria")
  - Połącz z lokalnymi specjałami - dobrze jest mieć mix preferencji użytkownika i lokalnej kuchni

• Zainteresowania tematyczne (np. "geografia", "biologia", "historia", "sztuka"):
  - Włącz do planu przynajmniej jedną-dwie atrakcje związane z każdym zainteresowaniem
  - "geografia" → punkty widokowe, wzgórza, terasy widokowe, ciekawe krajobrazy
  - "biologia" → ogrody botaniczne, akwaria, zoo, rezerwaty przyrody, parki z ciekawą florą
  - "historia" → muzea historyczne, zabytki, zamki, starówki
  - "sztuka" → galerie, muzea sztuki, street art, wystawy
  - W opisach można naturalnie wspomnieć związek z zainteresowaniem

Przykład zbalansowanego planu dla preferencji "włoska kuchnia", "biologia", "geografia":
- Dzień 1: Lunch w pizzerii (włoska kuchnia), Punkt widokowy (geografia)
- Dzień 2: Ogród Botaniczny (biologia), Kolacja z lokalnymi specjałami
- Dzień 3: Muzeum Narodowe, Kolacja w włoskiej restauracji`
        : ""
    }

WAŻNE - Wymagania dotyczące struktury danych: 
- Pole "activities" dla każdego dnia MUSI być OBIEKTEM z kluczami: "morning", "afternoon", "evening"
- Każdy z tych kluczy może zawierać TABLICĘ aktywności dla danej pory dnia lub być pominięty (undefined/null)
- Pory dnia są OPCJONALNE - możesz pominąć "morning" jeśli dzień zaczyna się później, lub pominąć "evening" jeśli kończy się wcześniej
- Przykład poprawnej struktury dla pełnego dnia:
  "activities": {
    "morning": [{ "name": "...", "description": "...", "priceCategory": "moderate", "logistics": {...} }],
    "afternoon": [{ "name": "...", ... }],
    "evening": [{ "name": "...", ... }]
  }
- Przykład dla dnia rozpoczynającego się wieczorem (np. dzień przyjazdu):
  "activities": {
    "evening": [{ "name": "...", ... }]
  }
- Przykład dla dnia kończącego się rano (np. dzień wyjazdu):
  "activities": {
    "morning": [{ "name": "...", ... }]
  }
- Każda aktywność MUSI mieć wypełnione pole priceCategory używając dokładnie jednej z wartości: "free", "budget", "moderate", "expensive"
- Każda aktywność MUSI zawierać szczegółowy opis (description)
- Staraj się uwzględnić realne miejsca i atrakcje z notatek użytkownika
- Dostosuj aktywności do wybranego stylu, transportu i budżetu
- Uwzględnij logistykę (adresy, szacowany czas)
- Stwórz plan na podstawie długości pobytu wskazanej w notatkach (lub domyślnie 3 dni)

WAŻNE - Wymagania dotyczące linków do map (logistics.mapLink):
- ZAWSZE używaj pełnego formatu Google Maps: https://www.google.com/maps/search/?api=1&query=NAZWA_MIEJSCA+MIASTO
- NIE używaj skróconych linków (goo.gl)
- Zamień spacje na + w nazwie miejsca
- ZAWSZE dodaj nazwę miasta na końcu query
- Przykład prawidłowy: https://www.google.com/maps/search/?api=1&query=Zamek+Królewski+Warszawa
- Przykład prawidłowy: https://www.google.com/maps/search/?api=1&query=Łazienki+Królewskie+Warszawa`;

    // Build user prompt with the actual note content
    const userPrompt = `Na podstawie poniższych notatek podróżnych, stwórz szczegółowy, ustrukturyzowany plan wycieczki:

${noteContent}

Pamiętaj o dostosowaniu planu do preferencji: styl ${style}, transport ${transport}, budżet ${budget}.`;

    // Call OpenRouter API with structured data schema
    // Pass model from runtime env (Cloudflare) or build-time env var, or undefined (uses default claude-3.5-haiku)
    const travelPlanContent = await openRouterService.getStructuredData({
      systemPrompt,
      userPrompt,
      schema: TravelPlanContentSchema,
      schemaName: "create_travel_plan",
      schemaDescription:
        "Tworzy ustrukturyzowany plan podróży z notatek użytkownika, uwzględniający preferencje dotyczące stylu, transportu i budżetu.",
      model: model, // From runtimeEnv.OPENROUTER_MODEL (Cloudflare) or build-time OPENROUTER_MODEL, or undefined (uses default)
      temperature: 0.7, // Some creativity but still consistent
      max_tokens: 8000, // Sufficient for long travel plans (5+ days)
    });

    // Convert to Json type for database storage
    return travelPlanContent as unknown as Json;
  }
}

// Export a singleton instance
export const travelPlanService = new TravelPlanService();
