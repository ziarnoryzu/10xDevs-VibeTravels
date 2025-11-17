// test/unit/services/travel-plan.service.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TravelPlanService } from "@/lib/services/travel-plan.service";

// Mock OpenRouterService to avoid needing API key
vi.mock("@/lib/openrouter.service", () => {
  const OpenRouterService = vi.fn();
  OpenRouterService.prototype.getStructuredData = vi.fn();
  return { OpenRouterService };
});

describe("TravelPlanService", () => {
  let service: TravelPlanService;

  beforeEach(() => {
    service = new TravelPlanService();
  });

  describe("validateNoteContent", () => {
    /**
     * REGUŁA BIZNESOWA: Notatka musi zawierać minimum 10 słów
     * aby umożliwić sensowne wygenerowanie planu podróży przez AI.
     */

    describe("should return false for invalid content", () => {
      it("should reject null content", () => {
        // Arrange & Act
        const result = service.validateNoteContent(null);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject empty string", () => {
        // Arrange
        const content = "";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject whitespace-only content", () => {
        // Arrange - różne kombinacje whitespace
        const contents = ["   ", "\n\n\n", "\t\t\t", "  \n  \t  ", "     \r\n     "];

        // Act & Assert
        contents.forEach((content) => {
          expect(service.validateNoteContent(content)).toBe(false);
        });
      });

      it("should reject content with fewer than 10 words", () => {
        // Arrange - dokładnie 9 słów
        const content = "Jadę do Paryża na trzy dni w przyszłym tygodniu";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject content with 9 words and extra whitespace", () => {
        // Arrange - 9 słów z wieloma spacjami i enterami
        const content = "Jadę   do    Paryża\n\nna   trzy   dni\tw   przyszłym";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(false);
      });

      it("should reject very short travel note", () => {
        // Arrange - krótka notatka (5 słów)
        const content = "Warszawa weekend dwa dni";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe("should return true for valid content", () => {
      it("should accept content with exactly 10 words", () => {
        // Arrange - dokładnie 10 słów (przypadek brzegowy)
        const content = "Jadę do Paryża na trzy dni w przyszłym tygodniu koniecznie";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });

      it("should accept content with 10 words and extra whitespace", () => {
        // Arrange - 10 słów z wieloma spacjami, tabulatorami i enterami
        const content = "Jadę   do    Paryża\n\nna   trzy   dni\tw   przyszłym   tygodniu   koniecznie";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });

      it("should accept realistic short travel note", () => {
        // Arrange - realistyczna krótka notatka (15 słów)
        const content =
          "Weekend w Krakowie. Chcę zobaczyć Wawel, Kazimierz i zjeść w dobrej restauracji. Nocleg w centrum.";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });

      it("should accept longer travel note with details", () => {
        // Arrange - dłuższa notatka z detalami (40+ słów)
        const content = `Planujemy rodzinną wycieczkę do Gdańska na długi weekend od 15 do 18 listopada.
        Chcemy zobaczyć Starówkę, Muzeum II Wojny Światowej, przejść się Molo w Sopocie.
        Interesuje nas lokalna kuchnia, szczególnie pierogi i ryby. Mamy samochód.
        Budżet standardowy. Nocleg już mamy zarezerwowany w centrum.`;

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });

      it("should accept content with special characters and emojis", () => {
        // Arrange - notatka ze znakami specjalnymi
        const content =
          "Wakacje 🌴 w Barcelonie! Sagrada Família, Park Güell, Las Ramblas - to wszystko chcę odwiedzić! :)";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });

      it("should accept content with numbers and dates", () => {
        // Arrange - notatka z datami i liczbami
        const content =
          "Wyjazd 20-23.12.2025 do Zakopanego. 4 osoby, 3 noclegi, budżet 2000 zł. Chcemy pojeździć na nartach.";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });

      it("should handle content with leading and trailing whitespace", () => {
        // Arrange - 10 słów z whitespace na początku i końcu
        const content = "   Jadę do Paryża na trzy dni w przyszłym tygodniu koniecznie   \n\n";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });

      it("should handle multiline formatted content", () => {
        // Arrange - sformatowana notatka z listą
        const content = `
          Wycieczka do Wrocławia:
          - Zwiedzanie Ostrowa Tumskiego
          - Spacer po Rynku
          - Wizyta w ZOO
          - Obiad w restauracji regionalnej
        `;

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });
    });

    /**
     * EDGE CASES: Nietypowe sytuacje, które mogą wystąpić
     */
    describe("edge cases", () => {
      it("should handle content with only punctuation between words", () => {
        // Arrange - 10 "słów" to znaki interpunkcyjne
        const content = "! @ # $ % ^ & * ( ) +";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true); // 11 "słów" oddzielonych spacjami
      });

      it("should count URLs as single words", () => {
        // Arrange - URL liczy się jako jedno słowo
        const content =
          "Rezerwacja https://booking.com/hotel nocleg trzy dni Kraków centrum czerwiec lipiec sierpień wakacje";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true); // 10 słów
      });

      it("should handle very long single word", () => {
        // Arrange - jedno bardzo długie "słowo"
        const content = "abcdefghijklmnopqrstuvwxyz0123456789 and nine more words to make ten total count here yes";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true);
      });

      it("should handle mixed language content", () => {
        // Arrange - mieszanka języków
        const content = "Trip to Paris avec mes amis for three days next week absolutely amazing";

        // Act
        const result = service.validateNoteContent(content);

        // Assert
        expect(result).toBe(true); // 12 słów
      });
    });
  });

  describe("generatePlan", () => {
    /**
     * REGUŁA BIZNESOWA: generatePlan() wykorzystuje OpenRouter AI
     * do generowania szczegółowych planów podróży na podstawie notatek użytkownika.
     * Musi uwzględniać opcje personalizacji (style, transport, budget)
     * oraz preferencje użytkownika z profilu.
     */

    let mockGetStructuredData: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      // Get reference to mocked method
      const { OpenRouterService } = await import("@/lib/openrouter.service");
      mockGetStructuredData = OpenRouterService.prototype.getStructuredData as ReturnType<typeof vi.fn>;
      mockGetStructuredData.mockClear();
    });

    it("should call OpenRouter with basic travel plan request", async () => {
      // Arrange
      const noteContent = "Weekend w Krakowie, chcę zobaczyć Wawel i Rynek Główny. Dwa dni w centrum.";
      const mockResponse = {
        destination: "Kraków",
        duration: 2,
        days: [
          {
            day: 1,
            activities: {
              morning: [{ name: "Wawel", description: "Zwiedzanie zamku", priceCategory: "moderate" }],
            },
          },
        ],
      };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generatePlan(noteContent);

      // Assert
      expect(mockGetStructuredData).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it("should use default options when none provided", async () => {
      // Arrange
      const noteContent = "Wycieczka do Warszawy na trzy dni. Muzea, restauracje, kultura.";
      const mockResponse = { destination: "Warszawa", duration: 3, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("wypoczynkowy"); // default style: leisure
      expect(callArgs.systemPrompt).toContain("komunikacja publiczna"); // default transport: public
      expect(callArgs.systemPrompt).toContain("standardowy"); // default budget: standard
    });

    it("should use provided style option - adventure", async () => {
      // Arrange
      const noteContent = "Góry Tatry, wędrówki szlakami górskimi, aktywny wypoczynek przez tydzień.";
      const options = { style: "adventure" as const };
      const mockResponse = { destination: "Tatry", duration: 7, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("przygodowy");
      expect(callArgs.systemPrompt).toContain("aktywne zwiedzanie");
    });

    it("should use provided style option - leisure", async () => {
      // Arrange
      const noteContent = "Relaks nad morzem, plaża, spokojne zwiedzanie Gdańska.";
      const options = { style: "leisure" as const };
      const mockResponse = { destination: "Gdańsk", duration: 4, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("wypoczynkowy");
      expect(callArgs.systemPrompt).toContain("spokojne tempo");
    });

    it("should use provided transport option - car", async () => {
      // Arrange
      const noteContent = "Road trip po Polsce, wynajmujemy samochód, elastyczny plan.";
      const options = { transport: "car" as const };
      const mockResponse = { destination: "Polska", duration: 5, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("samochód");
    });

    it("should use provided transport option - public", async () => {
      // Arrange
      const noteContent = "Zwiedzanie Warszawy, korzystamy z metra i autobusów.";
      const options = { transport: "public" as const };
      const mockResponse = { destination: "Warszawa", duration: 2, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("komunikacja publiczna");
    });

    it("should use provided transport option - walk", async () => {
      // Arrange
      const noteContent = "Spacery po Starówce, wszystko w zasięgu pieszych wędrówek.";
      const options = { transport: "walking" as const };
      const mockResponse = { destination: "Kraków", duration: 2, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("piesze przemieszczanie się");
    });

    it("should use provided budget option - economy", async () => {
      // Arrange
      const noteContent = "Tania wycieczka, hostele, tanie jedzenie, oszczędny budżet.";
      const options = { budget: "economy" as const };
      const mockResponse = { destination: "Poznań", duration: 3, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("ekonomiczny");
      expect(callArgs.systemPrompt).toContain("tanie opcje");
    });

    it("should use provided budget option - standard", async () => {
      // Arrange
      const noteContent = "Normalny hotel, średnie ceny, standardowa wycieczka.";
      const options = { budget: "standard" as const };
      const mockResponse = { destination: "Wrocław", duration: 3, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("standardowy");
      expect(callArgs.systemPrompt).toContain("średnie ceny");
    });

    it("should use provided budget option - luxury", async () => {
      // Arrange
      const noteContent = "Luksusowy hotel, ekskluzywne restauracje, premium wycieczka.";
      const options = { budget: "luxury" as const };
      const mockResponse = { destination: "Sopot", duration: 4, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("luksusowy");
      expect(callArgs.systemPrompt).toContain("premium opcje");
    });

    it("should combine multiple options", async () => {
      // Arrange
      const noteContent = "Przygoda w górach, własny samochód, ekonomiczny budżet.";
      const options = {
        style: "adventure" as const,
        transport: "car" as const,
        budget: "economy" as const,
      };
      const mockResponse = { destination: "Bieszczady", duration: 5, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, options);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("przygodowy");
      expect(callArgs.systemPrompt).toContain("samochód");
      expect(callArgs.systemPrompt).toContain("ekonomiczny");
    });

    it("should include user preferences in system prompt", async () => {
      // Arrange
      const noteContent = "Wycieczka do Barcelony, chcę dobrze zjeść i zobaczyć ciekawe miejsca.";
      const userPreferences = ["włoska kuchnia", "historia", "sztuka"];
      const mockResponse = { destination: "Barcelona", duration: 4, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, undefined, userPreferences);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("PREFERENCJE UŻYTKOWNIKA Z PROFILU");
      expect(callArgs.systemPrompt).toContain("włoska kuchnia");
      expect(callArgs.systemPrompt).toContain("historia");
      expect(callArgs.systemPrompt).toContain("sztuka");
    });

    it("should handle empty user preferences array", async () => {
      // Arrange
      const noteContent = "Weekend w Krakowie.";
      const userPreferences: string[] = [];
      const mockResponse = { destination: "Kraków", duration: 2, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent, undefined, userPreferences);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).not.toContain("PREFERENCJE UŻYTKOWNIKA Z PROFILU");
    });

    it("should not include preferences section when undefined", async () => {
      // Arrange
      const noteContent = "Tydzień w Warszawie.";
      const mockResponse = { destination: "Warszawa", duration: 7, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).not.toContain("PREFERENCJE UŻYTKOWNIKA Z PROFILU");
    });

    it("should pass note content in user prompt", async () => {
      // Arrange
      const noteContent = "Szczegółowa notatka o planowanej wycieczce do Zakopanego.";
      const mockResponse = { destination: "Zakopane", duration: 3, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain(noteContent);
      expect(callArgs.userPrompt).toContain("Na podstawie poniższych notatek podróżnych");
    });

    it("should pass TravelPlanContentSchema to OpenRouter", async () => {
      // Arrange
      const noteContent = "Wycieczka testowa.";
      const mockResponse = { destination: "Test", duration: 1, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.schemaName).toBe("create_travel_plan");
      expect(callArgs.schemaDescription).toContain("ustrukturyzowany plan podróży");
      expect(callArgs.schema).toBeDefined();
    });

    it("should use temperature 0.7 for balanced creativity", async () => {
      // Arrange
      const noteContent = "Kreatywna wycieczka.";
      const mockResponse = { destination: "Test", duration: 1, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.7);
    });

    it("should use max_tokens 8000 for long travel plans", async () => {
      // Arrange
      const noteContent = "Długa wycieczka przez całą Polskę, 10 dni.";
      const mockResponse = { destination: "Polska", duration: 10, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.max_tokens).toBe(8000);
    });

    it("should use model from environment variable when set", async () => {
      // Arrange
      const originalEnv = import.meta.env.OPENROUTER_MODEL;
      import.meta.env.OPENROUTER_MODEL = "anthropic/claude-3-opus";
      const customService = new TravelPlanService();
      const noteContent = "Test model selection.";
      const mockResponse = { destination: "Test", duration: 1, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await customService.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.model).toBe("anthropic/claude-3-opus");

      // Cleanup
      import.meta.env.OPENROUTER_MODEL = originalEnv;
    });

    it("should pass undefined model when env var not set", async () => {
      // Arrange
      const originalEnv = import.meta.env.OPENROUTER_MODEL;
      delete import.meta.env.OPENROUTER_MODEL;
      const defaultService = new TravelPlanService();
      const noteContent = "Test default model.";
      const mockResponse = { destination: "Test", duration: 1, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await defaultService.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.model).toBeUndefined();

      // Cleanup
      if (originalEnv) {
        import.meta.env.OPENROUTER_MODEL = originalEnv;
      }
    });

    it("should include date logic explanation in system prompt", async () => {
      // Arrange
      const noteContent = "Wycieczka 15-18 listopada.";
      const mockResponse = { destination: "Test", duration: 4, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("Wymagania dotyczące dat i numeracji dni");
      expect(callArgs.systemPrompt).toContain("ISO (YYYY-MM-DD)");
      expect(callArgs.systemPrompt).toContain("dayOfWeek");
      expect(callArgs.systemPrompt).toContain("KRYTYCZNE - Logika wyboru roku");
    });

    it("should include activities structure requirements in system prompt", async () => {
      // Arrange
      const noteContent = "Plan dnia z różnymi aktywnościami.";
      const mockResponse = { destination: "Test", duration: 1, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("Wymagania dotyczące struktury danych");
      expect(callArgs.systemPrompt).toContain('"morning"');
      expect(callArgs.systemPrompt).toContain('"afternoon"');
      expect(callArgs.systemPrompt).toContain('"evening"');
      expect(callArgs.systemPrompt).toContain("priceCategory");
    });

    it("should include map link requirements in system prompt", async () => {
      // Arrange
      const noteContent = "Miejsca do odwiedzenia z mapami.";
      const mockResponse = { destination: "Test", duration: 1, days: [] };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      await service.generatePlan(noteContent);

      // Assert
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("Wymagania dotyczące linków do map");
      expect(callArgs.systemPrompt).toContain("google.com/maps/search");
      expect(callArgs.systemPrompt).toContain("NIE używaj skróconych linków");
    });

    it("should return travel plan as Json type", async () => {
      // Arrange
      const noteContent = "Prosty plan testowy.";
      const mockResponse = {
        destination: "Gdańsk",
        duration: 2,
        days: [
          {
            day: 1,
            date: "2025-11-15",
            activities: {
              morning: [{ name: "Test", description: "Test activity", priceCategory: "free" }],
            },
          },
        ],
      };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generatePlan(noteContent);

      // Assert
      expect(result).toEqual(mockResponse);
      // Result should be Json-compatible (can be stored in database)
      expect(typeof result).toBe("object");
    });

    it("should handle realistic scenario with all parameters", async () => {
      // Arrange - pełny, realistyczny scenariusz
      const noteContent = `
        Planujemy rodzinną wycieczkę do Gdańska od 15 do 18 listopada 2025.
        Chcemy zobaczyć Starówkę, Muzeum II Wojny Światowej, Molo w Sopocie.
        Interesuje nas lokalna kuchnia, szczególnie pierogi i ryby.
        Mamy samochód. Budżet standardowy.
      `;
      const options = {
        style: "leisure" as const,
        transport: "car" as const,
        budget: "standard" as const,
      };
      const userPreferences = ["polska kuchnia", "historia", "architektura"];
      const mockResponse = {
        destination: "Gdańsk",
        duration: 4,
        days: [
          {
            day: 1,
            date: "2025-11-15",
            dayOfWeek: "Sobota",
            activities: {
              morning: [{ name: "Starówka", description: "Spacer", priceCategory: "free" }],
              afternoon: [{ name: "Muzeum", description: "Zwiedzanie", priceCategory: "moderate" }],
              evening: [{ name: "Restauracja", description: "Kolacja", priceCategory: "moderate" }],
            },
          },
        ],
      };
      mockGetStructuredData.mockResolvedValue(mockResponse);

      // Act
      const result = await service.generatePlan(noteContent, options, userPreferences);

      // Assert
      expect(mockGetStructuredData).toHaveBeenCalledTimes(1);
      const callArgs = mockGetStructuredData.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("wypoczynkowy");
      expect(callArgs.systemPrompt).toContain("samochód");
      expect(callArgs.systemPrompt).toContain("standardowy");
      expect(callArgs.systemPrompt).toContain("polska kuchnia");
      expect(callArgs.systemPrompt).toContain("historia");
      expect(callArgs.systemPrompt).toContain("architektura");
      expect(callArgs.userPrompt).toContain("Gdańska od 15 do 18 listopada");
      expect(result).toEqual(mockResponse);
    });
  });
});
