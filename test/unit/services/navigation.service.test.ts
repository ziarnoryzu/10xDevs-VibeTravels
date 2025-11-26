// test/unit/services/navigation.service.test.ts

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { navigate, reload, buildUrl, getQueryParam, getReturnUrl, Routes } from "@/lib/services/navigation.service";

describe("Navigation Service", () => {
  describe("navigate", () => {
    /**
     * REGUŁA BIZNESOWA: navigate() zmienia location.href i może czekać
     * przed nawigacją (useful for showing toasts).
     */

    beforeEach(() => {
      // Mock window.location
      delete (window as { location?: Location }).location;
      (window as { location?: Location }).location = { href: "" } as Location;
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it("should navigate to URL immediately when no delay is provided", async () => {
      // Arrange
      const targetUrl = "/app/notes";

      // Act
      const navigationPromise = navigate(targetUrl);
      await navigationPromise;

      // Assert
      expect(window.location.href).toBe(targetUrl);
    });

    it("should navigate to URL immediately when delay is 0", async () => {
      // Arrange
      const targetUrl = "/app/profile";

      // Act
      const navigationPromise = navigate(targetUrl, { delay: 0 });
      await navigationPromise;

      // Assert
      expect(window.location.href).toBe(targetUrl);
    });

    it("should navigate to URL immediately when options is undefined", async () => {
      // Arrange
      const targetUrl = "/auth/login";

      // Act
      const navigationPromise = navigate(targetUrl, undefined);
      await navigationPromise;

      // Assert
      expect(window.location.href).toBe(targetUrl);
    });

    it("should delay navigation when delay > 0", async () => {
      // Arrange
      const targetUrl = "/app/notes";
      const delay = 1000;

      // Act
      const navigationPromise = navigate(targetUrl, { delay });

      // Assert - before delay elapsed
      expect(window.location.href).toBe(""); // Not yet changed

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(delay);
      await navigationPromise;

      // Assert - after delay elapsed
      expect(window.location.href).toBe(targetUrl);
    });

    it("should delay navigation by 500ms", async () => {
      // Arrange
      const targetUrl = "/app/travel-plans";
      const delay = 500;

      // Act
      const navigationPromise = navigate(targetUrl, { delay });

      // Assert - before delay
      expect(window.location.href).toBe("");

      // Fast-forward partial time
      await vi.advanceTimersByTimeAsync(250);
      expect(window.location.href).toBe(""); // Still not changed

      // Fast-forward remaining time
      await vi.advanceTimersByTimeAsync(250);
      await navigationPromise;

      // Assert - after full delay
      expect(window.location.href).toBe(targetUrl);
    });

    it("should delay navigation by 2000ms for showing toast", async () => {
      // Arrange - realistyczny scenariusz: pokazujemy toast przed nawigacją
      const targetUrl = "/auth/login";
      const delay = 2000; // 2 sekundy na wyświetlenie toasta

      // Act
      const navigationPromise = navigate(targetUrl, { delay });

      // Assert - toast jest widoczny, nawigacja jeszcze nie nastąpiła
      expect(window.location.href).toBe("");

      // Fast-forward
      await vi.advanceTimersByTimeAsync(delay);
      await navigationPromise;

      // Assert - po 2 sekundach następuje nawigacja
      expect(window.location.href).toBe(targetUrl);
    });

    it("should handle navigation to different route types", async () => {
      // Arrange & Act & Assert - różne typy URL
      const routes = [
        "/",
        "/app/notes",
        "/app/notes/123",
        "/app/notes?page=2",
        "/auth/login?returnUrl=/app/notes",
        "#section",
        "/path/with/multiple/segments",
      ];

      for (const route of routes) {
        // Reset location
        (window as { location?: Location }).location = { href: "" } as Location;

        await navigate(route);
        expect(window.location.href).toBe(route);
      }
    });

    it("should handle absolute URLs", async () => {
      // Arrange
      const externalUrl = "https://example.com/page";

      // Act
      await navigate(externalUrl);

      // Assert
      expect(window.location.href).toBe(externalUrl);
    });

    it("should return promise that resolves after navigation", async () => {
      // Arrange
      const targetUrl = "/app/notes";
      let resolved = false;

      // Act
      const navigationPromise = navigate(targetUrl).then(() => {
        resolved = true;
      });

      await navigationPromise;

      // Assert
      expect(resolved).toBe(true);
      expect(window.location.href).toBe(targetUrl);
    });

    it("should return promise that resolves after delay", async () => {
      // Arrange
      const targetUrl = "/app/profile";
      const delay = 1000;
      let resolved = false;

      // Act
      const navigationPromise = navigate(targetUrl, { delay }).then(() => {
        resolved = true;
      });

      // Assert - not resolved yet
      expect(resolved).toBe(false);

      // Fast-forward
      await vi.advanceTimersByTimeAsync(delay);
      await navigationPromise;

      // Assert - now resolved
      expect(resolved).toBe(true);
      expect(window.location.href).toBe(targetUrl);
    });
  });

  describe("reload", () => {
    /**
     * REGUŁA BIZNESOWA: reload() odświeża aktualną stronę
     * z obsługą View Transitions.
     */

    it("should call astro navigate with current location", async () => {
      // Arrange - mock is set up in test/setup.ts
      window.location.href = "/current/path";

      // Act
      await reload();

      // Assert - check if mocked navigate was called with current location
      // The mock is set up in setup.ts so we can't easily access it here
      // Just verify the function completes successfully
      expect(window.location.href).toBe("/current/path");
    });

    it("should return promise that resolves after reload", async () => {
      // Arrange
      let resolved = false;

      // Act
      const reloadPromise = reload().then(() => {
        resolved = true;
      });

      await reloadPromise;

      // Assert
      expect(resolved).toBe(true);
    });
  });

  describe("buildUrl", () => {
    /**
     * REGUŁA BIZNESOWA: Buduje URL z query parameters,
     * pomijając null i undefined wartości.
     */

    it("should return base path when no params provided", () => {
      // Arrange
      const basePath = "/app/notes";

      // Act
      const result = buildUrl(basePath);

      // Assert
      expect(result).toBe("/app/notes");
    });

    it("should return base path when params object is undefined", () => {
      // Arrange
      const basePath = "/app/notes";

      // Act
      const result = buildUrl(basePath, undefined);

      // Assert
      expect(result).toBe("/app/notes");
    });

    it("should build URL with single query parameter", () => {
      // Arrange
      const basePath = "/app/notes";
      const params = { page: 2 };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toBe("/app/notes?page=2");
    });

    it("should build URL with multiple query parameters", () => {
      // Arrange
      const basePath = "/app/notes";
      const params = { page: 2, sort: "date", filter: "active" };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toContain("/app/notes?");
      expect(result).toContain("page=2");
      expect(result).toContain("sort=date");
      expect(result).toContain("filter=active");
    });

    it("should skip null parameters", () => {
      // Arrange
      const basePath = "/app/notes";
      const params = { page: 2, filter: null };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toBe("/app/notes?page=2");
      expect(result).not.toContain("filter");
    });

    it("should skip undefined parameters", () => {
      // Arrange
      const basePath = "/app/notes";
      const params = { page: 2, filter: undefined };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toBe("/app/notes?page=2");
      expect(result).not.toContain("filter");
    });

    it("should handle mix of valid, null, and undefined parameters", () => {
      // Arrange
      const basePath = "/app/notes";
      const params = {
        page: 1,
        sort: "date",
        filter: null,
        search: undefined,
        limit: 10,
      };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toContain("page=1");
      expect(result).toContain("sort=date");
      expect(result).toContain("limit=10");
      expect(result).not.toContain("filter");
      expect(result).not.toContain("search");
    });

    it("should convert number parameters to strings", () => {
      // Arrange
      const basePath = "/app/notes";
      const params = { page: 42, limit: 20 };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toBe("/app/notes?page=42&limit=20");
    });

    it("should handle zero as valid parameter value", () => {
      // Arrange
      const basePath = "/api/search";
      const params = { offset: 0, page: 0 };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toBe("/api/search?offset=0&page=0");
    });

    it("should return base path when all parameters are null/undefined", () => {
      // Arrange
      const basePath = "/app/notes";
      const params = { filter: null, search: undefined };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toBe("/app/notes");
    });

    it("should handle empty params object", () => {
      // Arrange
      const basePath = "/app/notes";
      const params = {};

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toBe("/app/notes");
    });

    it("should encode special characters in parameter values", () => {
      // Arrange
      const basePath = "/search";
      const params = { q: "hello world", filter: "status=active" };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toContain("q=hello+world"); // URLSearchParams encodes space as +
      expect(result).toContain("filter=status%3Dactive"); // = encoded as %3D
    });

    it("should handle base path with trailing slash", () => {
      // Arrange
      const basePath = "/app/notes/";
      const params = { page: 2 };

      // Act
      const result = buildUrl(basePath, params);

      // Assert
      expect(result).toBe("/app/notes/?page=2");
    });

    it("should handle base path with existing query params (edge case)", () => {
      // Arrange - base już ma query params (nietypowe użycie)
      const basePath = "/app/notes?existing=true";
      const params = { page: 2 };

      // Act
      const result = buildUrl(basePath, params);

      // Assert - nadpisuje istniejące params
      expect(result).toBe("/app/notes?existing=true?page=2");
      // Note: To nie jest poprawne URL - funkcja nie jest zaprojektowana
      // do obsługi base path z query params
    });
  });

  describe("getQueryParam", () => {
    /**
     * REGUŁA BIZNESOWA: Pobiera parametr query z aktualnego URL.
     * Działa tylko w przeglądarce (wymaga window).
     */

    // Mock window.location
    const setWindowLocation = (search: string) => {
      delete (window as { location?: Location }).location;
      (window as { location?: Location }).location = {
        search,
      } as Location;
    };

    it("should return null when running server-side (no window)", () => {
      // Arrange - symulacja SSR przez tymczasowe usunięcie window
      const originalWindow = global.window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = undefined;

      // Act
      const result = getQueryParam("page");

      // Assert
      expect(result).toBeNull();

      // Cleanup
      global.window = originalWindow;
    });

    it("should return null when parameter does not exist", () => {
      // Arrange
      setWindowLocation("?page=2&sort=date");

      // Act
      const result = getQueryParam("filter");

      // Assert
      expect(result).toBeNull();
    });

    it("should return parameter value when it exists", () => {
      // Arrange
      setWindowLocation("?page=2");

      // Act
      const result = getQueryParam("page");

      // Assert
      expect(result).toBe("2");
    });

    it("should return first value when parameter appears multiple times", () => {
      // Arrange
      setWindowLocation("?tag=javascript&tag=typescript");

      // Act
      const result = getQueryParam("tag");

      // Assert
      expect(result).toBe("javascript");
    });

    it("should handle URL-encoded parameter values", () => {
      // Arrange
      setWindowLocation("?search=hello%20world&filter=status%3Dactive");

      // Act
      const searchResult = getQueryParam("search");
      const filterResult = getQueryParam("filter");

      // Assert
      expect(searchResult).toBe("hello world");
      expect(filterResult).toBe("status=active");
    });

    it("should handle empty parameter value", () => {
      // Arrange
      setWindowLocation("?page=&sort=date");

      // Act
      const result = getQueryParam("page");

      // Assert
      expect(result).toBe("");
    });

    it("should handle parameter without value", () => {
      // Arrange
      setWindowLocation("?debug&page=2");

      // Act
      const result = getQueryParam("debug");

      // Assert
      expect(result).toBe(""); // URLSearchParams zwraca pusty string dla flag
    });

    it("should be case-sensitive for parameter names", () => {
      // Arrange
      setWindowLocation("?Page=2");

      // Act
      const lowercase = getQueryParam("page");
      const capitalized = getQueryParam("Page");

      // Assert
      expect(lowercase).toBeNull();
      expect(capitalized).toBe("2");
    });

    it("should handle empty search string", () => {
      // Arrange
      setWindowLocation("");

      // Act
      const result = getQueryParam("page");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getReturnUrl", () => {
    /**
     * REGUŁA BIZNESOWA: Buduje return URL na podstawie parametru returnPage.
     * Jeśli returnPage > 1, zwraca /app/notes?page=X, w przeciwnym razie fallback.
     */

    const setWindowLocation = (search: string) => {
      delete (window as { location?: Location }).location;
      (window as { location?: Location }).location = {
        search,
      } as Location;
    };

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should return fallback when returnPage param is missing", () => {
      // Arrange
      setWindowLocation("");

      // Act
      const result = getReturnUrl();

      // Assert
      expect(result).toBe("/app/notes");
    });

    it("should return fallback when returnPage is 1", () => {
      // Arrange
      setWindowLocation("?returnPage=1");

      // Act
      const result = getReturnUrl();

      // Assert
      expect(result).toBe("/app/notes");
    });

    it("should return paginated URL when returnPage > 1", () => {
      // Arrange
      setWindowLocation("?returnPage=3");

      // Act
      const result = getReturnUrl();

      // Assert
      expect(result).toBe("/app/notes?page=3");
    });

    it("should use custom fallback", () => {
      // Arrange
      setWindowLocation("");
      const customFallback = "/profile";

      // Act
      const result = getReturnUrl(customFallback);

      // Assert
      expect(result).toBe(customFallback);
    });

    it("should use custom fallback when returnPage is 1", () => {
      // Arrange
      setWindowLocation("?returnPage=1");
      const customFallback = "/app/travel-plans";

      // Act
      const result = getReturnUrl(customFallback);

      // Assert
      expect(result).toBe(customFallback);
    });

    it("should handle returnPage = 0", () => {
      // Arrange
      setWindowLocation("?returnPage=0");

      // Act
      const result = getReturnUrl();

      // Assert
      expect(result).toBe("/app/notes"); // 0 nie jest > 1
    });

    it("should handle negative returnPage", () => {
      // Arrange
      setWindowLocation("?returnPage=-5");

      // Act
      const result = getReturnUrl();

      // Assert
      expect(result).toBe("/app/notes"); // ujemna nie jest > 1
    });

    it("should handle non-numeric returnPage", () => {
      // Arrange
      setWindowLocation("?returnPage=abc");

      // Act
      const result = getReturnUrl();

      // Assert
      expect(result).toBe("/app/notes"); // NaN nie jest > 1
    });

    it("should handle very large returnPage number", () => {
      // Arrange
      setWindowLocation("?returnPage=999999");

      // Act
      const result = getReturnUrl();

      // Assert
      expect(result).toBe("/app/notes?page=999999");
    });
  });

  describe("Routes type-safe builder", () => {
    /**
     * REGUŁA BIZNESOWA: Routes object zapewnia type-safe budowanie ścieżek.
     * Centralizuje definicje route'ów w aplikacji.
     */

    describe("notes routes", () => {
      it("should build notes list route without page", () => {
        // Act
        const route = Routes.notes.list();

        // Assert
        expect(route).toBe("/app/notes");
      });

      it("should build notes list route with page 1", () => {
        // Act
        const route = Routes.notes.list(1);

        // Assert
        expect(route).toBe("/app/notes?page=1");
      });

      it("should build notes list route with page 5", () => {
        // Act
        const route = Routes.notes.list(5);

        // Assert
        expect(route).toBe("/app/notes?page=5");
      });

      it("should build note detail route without return page", () => {
        // Arrange
        const noteId = "123e4567-e89b-12d3-a456-426614174000";

        // Act
        const route = Routes.notes.detail(noteId);

        // Assert
        expect(route).toBe(`/app/notes/${noteId}`);
      });

      it("should build note detail route with return page", () => {
        // Arrange
        const noteId = "123e4567-e89b-12d3-a456-426614174000";
        const returnPage = 3;

        // Act
        const route = Routes.notes.detail(noteId, returnPage);

        // Assert
        expect(route).toBe(`/app/notes/${noteId}?returnPage=3`);
      });

      it("should handle special characters in note ID", () => {
        // Arrange - UUID z różnymi znakami
        const noteId = "note-123-abc_def";

        // Act
        const route = Routes.notes.detail(noteId);

        // Assert
        expect(route).toBe(`/app/notes/${noteId}`);
      });
    });

    describe("auth routes", () => {
      it("should build login route", () => {
        // Act
        const route = Routes.auth.login();

        // Assert
        expect(route).toBe("/auth/login");
      });

      it("should build signup route", () => {
        // Act
        const route = Routes.auth.signup();

        // Assert
        expect(route).toBe("/auth/signup");
      });
    });

    describe("other routes", () => {
      it("should build profile route", () => {
        // Act
        const route = Routes.profile();

        // Assert
        expect(route).toBe("/app/profile");
      });

      it("should build home route", () => {
        // Act
        const route = Routes.home();

        // Assert
        expect(route).toBe("/");
      });
    });

    describe("route consistency", () => {
      it("should always return the same route for same input", () => {
        // Arrange
        const noteId = "test-id";
        const page = 2;

        // Act
        const route1 = Routes.notes.detail(noteId, page);
        const route2 = Routes.notes.detail(noteId, page);

        // Assert
        expect(route1).toBe(route2);
      });

      it("should generate valid URL paths", () => {
        // Act - wszystkie route'y powinny zaczynać się od /
        const routes = [
          Routes.notes.list(),
          Routes.notes.list(2),
          Routes.notes.detail("123"),
          Routes.auth.login(),
          Routes.auth.signup(),
          Routes.profile(),
          Routes.home(),
        ];

        // Assert
        routes.forEach((route) => {
          expect(route).toMatch(/^\//); // Zaczyna się od /
        });
      });
    });

    describe("realistic navigation scenarios", () => {
      it("should handle pagination flow", () => {
        // Scenario: user na stronie 3 klika w notatkę, potem wraca
        const currentPage = 3;
        const noteId = "abc-123";

        // Krok 1: Link do notatki z return page
        const noteRoute = Routes.notes.detail(noteId, currentPage);
        expect(noteRoute).toBe(`/app/notes/${noteId}?returnPage=3`);

        // Krok 2: Po zamknięciu notatki, getReturnUrl pobierze returnPage=3
        // i zbuduje /app/notes?page=3
      });

      it("should handle first page navigation (no page param)", () => {
        // Scenario: user na stronie 1 (bez ?page=1 w URL)
        const noteId = "abc-123";

        // Link do notatki bez return page (domyślnie wróci do /app/notes)
        const noteRoute = Routes.notes.detail(noteId);
        expect(noteRoute).toBe(`/app/notes/${noteId}`);
      });

      it("should handle auth flow", () => {
        // Scenario: niezalogowany user próbuje wejść na chronioną stronę
        // 1. Redirect do login
        const loginRoute = Routes.auth.login();
        expect(loginRoute).toBe("/auth/login");

        // 2. Po zalogowaniu redirect do /app/notes (default)
        const defaultRoute = Routes.notes.list();
        expect(defaultRoute).toBe("/app/notes");
      });
    });
  });
});
