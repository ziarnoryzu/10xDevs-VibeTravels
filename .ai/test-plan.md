# Plan Testów - VibeTravels

## 1. Wprowadzenie i cele testowania

### 1.1. Cel dokumentu
Plan testów dla aplikacji VibeTravels MVP - aplikacji webowej wspomaganej AI do generowania planów podróży na podstawie notatek użytkownika.

### 1.2. Cele testowania
- Weryfikacja poprawności wszystkich zaimplementowanych funkcjonalności zgodnie z wymaganiami PRD
- Zapewnienie wysokiej jakości kodu i komponentów React/Astro
- Walidacja integracji z zewnętrznymi serwisami (Supabase, OpenRouter.ai)
- Potwierdzenie bezpieczeństwa danych użytkowników i poprawności polityk RLS
- Weryfikacja dostępności (accessibility) interfejsu użytkownika
- Sprawdzenie wydajności generowania planów AI i responsywności aplikacji
- Walidacja poprawności obsługi błędów we wszystkich warstwach aplikacji

### 1.3. Zakres MVP objęty testami
- System autentykacji i zarządzania kontami użytkowników
- CRUD operacje na notatkach podróżnych
- Zarządzanie profilem i preferencjami użytkownika
- Generowanie planów podróży przez AI (integracja OpenRouter)
- System onboardingu dla nowych użytkowników
- Interfejs użytkownika (komponenty React i strony Astro)

## 2. Zakres testów

### 2.1. Elementy podlegające testom

#### Backend (API Endpoints)
- **Autentykacja** (`/api/auth/*`)
  - `/api/auth/register` (POST)
  - `/api/auth/login` (POST)
  - `/api/auth/logout` (POST)
  - `/api/auth/forgot-password` (POST)
  - `/api/auth/reset-password` (POST)
  - `/api/auth/password` (PUT)

- **Profile użytkowników** (`/api/profiles/*`)
  - `/api/profiles/me` (GET, PUT, DELETE)

- **Notatki** (`/api/notes/*`)
  - `/api/notes` (GET, POST)
  - `/api/notes/[noteId]` (GET, PUT, DELETE)
  - `/api/notes/[noteId]/copy` (POST)

- **Plany podróży** (`/api/notes/[noteId]/*`)
  - `/api/notes/[noteId]/generate-plan` (POST)
  - `/api/notes/[noteId]/travel-plan` (GET, PUT, HEAD)

#### Frontend (Komponenty i Widoki)
- **Komponenty autentykacji**
  - LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm
  - OnboardingModal
  - LogoutButton

- **Komponenty zarządzania notatkami**
  - NotesListView, NotesList, NoteListItem
  - NoteDetailView, NoteEditor
  - EmptyState, NotesListSkeleton

- **Komponenty profilu**
  - ProfileView
  - ProfilePreferencesForm, TravelPreferencesForm

- **Komponenty planów podróży**
  - GeneratedPlanView, GenerationOptionsForm
  - LoadingView, ErrorView

- **Komponenty layoutu**
  - Sidebar, MobileNav, NavLink

#### Serwisy i logika biznesowa
- **OpenRouterService** (`src/lib/openrouter.service.ts`)
  - Komunikacja z API OpenRouter
  - Obsługa błędów API
  - Generowanie strukturalnych danych (Zod)

- **TravelPlanService** (`src/lib/services/travel-plan.service.ts`)
  - Walidacja zawartości notatek
  - Generowanie planów z uwzględnieniem preferencji
  - Integracja z OpenRouterService

#### Baza danych
- **Migracje**
  - Schema początkowy (profiles, notes, travel_plans)
  - Polityki RLS
  - Triggery (auto-tworzenie profilu, updated_at)

- **Operacje CRUD**
  - Poprawność zapytań
  - Przestrzeganie polityk RLS
  - Integralność danych

#### Middleware i bezpieczeństwo
- **Middleware autentykacji** (`src/middleware/index.ts`)
  - Weryfikacja sesji użytkownika
  - Przekierowania dla nieautoryzowanych użytkowników
  - Obsługa ścieżek publicznych

### 2.2. Elementy niepodlegające testom w MVP
- Zaawansowane funkcje logistyki (rezerwacje, integracje zewnętrzne)
- Współdzielenie planów między użytkownikami
- Obsługa multimediów (zdjęcia, pliki)
- Funkcje monetyzacji
- Manualna edycja wygenerowanych planów

## 3. Typy testów do przeprowadzenia

### 3.1. Testy jednostkowe (Unit Tests)
**Cel:** Weryfikacja poprawności działania pojedynczych funkcji i metod

**Narzędzia:** Vitest, React Testing Library

**Zakres:**
- Funkcje pomocnicze (utils)
- Schematy walidacji Zod
- Metody serwisów (walidacja, formatowanie danych)
- Hooki React (useNoteDetail, useProfile, useAuth)
- Komponenty UI (Button, Input, Select, etc.)

**Przykładowe przypadki testowe:**
- Walidacja schematu TravelPlanContentSchema dla różnych struktur danych
- Funkcja `validateNoteContent()` w TravelPlanService
- Formatowanie dat w GeneratedPlanView
- Konwersja Zod schema do JSON schema w OpenRouterService

### 3.2. Testy integracyjne (Integration Tests)
**Cel:** Weryfikacja współpracy między komponentami i warstwami aplikacji

**Narzędzia:** Vitest, Playwright Component Testing

**Zakres:**
- Integracja komponentów React z API endpoints
- Przepływ danych między serwisami a bazą danych
- Integracja OpenRouterService z zewnętrznym API
- Middleware z systemem autentykacji Supabase

**Przykładowe przypadki testowe:**
- Pełny flow tworzenia notatki: formularz → API → baza danych → odświeżenie listy
- Generowanie planu: kliknięcie przycisku → modal → wywołanie API → OpenRouter → zapis w bazie
- Logowanie użytkownika: formularz → API → Supabase Auth → przekierowanie
- Onboarding: rejestracja → trigger bazy danych → utworzenie przykładowej notatki

### 3.3. Testy end-to-end (E2E Tests)
**Cel:** Weryfikacja pełnych scenariuszy użytkownika w środowisku zbliżonym do produkcyjnego

**Narzędzia:** Playwright

**Zakres:**
- Krytyczne ścieżki użytkownika (happy paths)
- Scenariusze edge cases
- Wieloetapowe przepływy biznesowe

**Przykładowe scenariusze:**
1. **Rejestracja nowego użytkownika i pierwszy plan**
   - Rejestracja → wypełnienie preferencji → wyświetlenie przykładowej notatki → przeglądanie planu

2. **Tworzenie i edycja notatki**
   - Logowanie → utworzenie notatki → edycja treści → autosave → weryfikacja

3. **Generowanie planu z opcjami personalizacji**
   - Otworzenie notatki → kliknięcie "Generuj plan" → wybór opcji (styl, transport, budżet) → wygenerowanie → zapisanie

4. **Kopiowanie notatki i warianty planów**
   - Otworzenie notatki z planem → kopiowanie → edycja kopii → generowanie nowego planu z innymi opcjami

5. **Zarządzanie profilem**
   - Edycja nazwy → zmiana preferencji → zmiana hasła → weryfikacja

### 3.4. Testy API (API Tests)
**Cel:** Weryfikacja poprawności endpointów REST API

**Narzędzia:** Vitest, supertest (lub bezpośrednie wywołania fetch w testach)

**Zakres:**
- Wszystkie endpointy API (10 głównych + auth)
- Walidacja requestów (Zod schemas)
- Poprawność responses (status codes, format JSON)
- Obsługa błędów (400, 401, 404, 500)

**Przykładowe przypadki testowe:**

**Auth endpoints:**
- POST /api/auth/register - sukces, duplikat email, błędna walidacja
- POST /api/auth/login - sukces, błędne hasło, nieistniejący użytkownik
- POST /api/auth/logout - sukces, brak sesji

**Notes endpoints:**
- GET /api/notes - paginacja, sortowanie, puste wyniki
- POST /api/notes - sukces, walidacja (tytuł, content)
- GET /api/notes/[noteId] - sukces, 404, brak dostępu (RLS)
- PUT /api/notes/[noteId] - aktualizacja, partial update, walidacja
- DELETE /api/notes/[noteId] - sukces, 404, brak dostępu

**Travel plan endpoints:**
- POST /api/notes/[noteId]/generate-plan - sukces, za krótka notatka (< 10 słów), błąd AI
- GET /api/notes/[noteId]/travel-plan - sukces, 404 (brak planu)
- PUT /api/notes/[noteId]/travel-plan - regeneracja z confirm=true, błąd bez confirm

### 3.5. Testy bezpieczeństwa (Security Tests)
**Cel:** Weryfikacja polityk bezpieczeństwa i ochrony danych

**Narzędzia:** Testy manualne, Supabase Dashboard, SQL queries

**Zakres:**
- Row Level Security (RLS) policies
- Autentykacja i autoryzacja
- Ochrona przed atakami (SQL injection, XSS)
- Bezpieczne zarządzanie sesjami i cookies

**Przypadki testowe:**
- **RLS dla profiles:** użytkownik A nie może odczytać profilu użytkownika B
- **RLS dla notes:** użytkownik A nie może modyfikować notatki użytkownika B
- **RLS dla travel_plans:** dostęp do planu tylko przez właściciela notatki
- **Middleware:** próba dostępu do /app/notes bez logowania → przekierowanie
- **API guards:** wywołanie protected endpoint bez sesji → 401 Unauthorized
- **CSRF protection:** weryfikacja zabezpieczeń Supabase SSR
- **Secrets management:** klucze API (OPENROUTER_API_KEY) tylko server-side

### 3.6. Testy wydajnościowe (Performance Tests)
**Cel:** Weryfikacja czasu odpowiedzi i wydajności aplikacji

**Narzędzia:** Lighthouse, Playwright (czas ładowania), monitoring API

**Zakres:**
- Czas ładowania stron
- Czas generowania planu AI
- Responsywność UI (autosave, paginacja)
- First Contentful Paint (FCP), Time to Interactive (TTI)

**Przypadki testowe:**
- Czas ładowania listy notatek (< 1s dla 50 notatek)
- Autosave w NoteEditor (debounce 500ms, request < 200ms)
- Generowanie planu 3-dniowego (< 15s dla claude-3.5-haiku)
- Lighthouse score dla stron głównych (Performance > 90)

### 3.7. Testy dostępności (Accessibility Tests)
**Cel:** Zapewnienie dostępności dla użytkowników z niepełnosprawnościami

**Narzędzia:** axe-core, Lighthouse, testy manualne z czytnikiem ekranu

**Zakres:**
- Formularze (labels, aria-describedby, aria-invalid)
- Nawigacja klawiaturą (focus management, tab order)
- Semantyczne HTML (headings, landmarks)
- Kontrast kolorów (WCAG 2.1 AA)
- Komunikaty błędów i status (aria-live)

**Przypadki testowe:**
- Wszystkie inputy posiadają powiązane labels (via htmlFor)
- Nawigacja w formularzu tylko przy użyciu klawiatury (Tab, Enter, Escape)
- Komunikaty o błędach walidacji czytane przez czytnik ekranu
- Kontrast kolorów > 4.5:1 dla tekstu normalnego
- Focus indicators widoczne dla wszystkich interaktywnych elementów
- Modale (Dialog) zarządzają focus (trap, restore)

### 3.8. Testy walidacji danych (Data Validation Tests)
**Cel:** Weryfikacja poprawności walidacji wejść użytkownika

**Narzędzia:** Vitest, testy jednostkowe schematów Zod

**Zakres:**
- Wszystkie schematy Zod (auth, notes, profiles, travel-plan)
- Walidacja na poziomie frontend (React forms)
- Walidacja na poziomie backend (API endpoints)

**Przypadki testowe:**

**Login schema:**
- Email: format, wymagalność
- Password: min. 8 znaków, wymagalność

**Register schema:**
- Email: format, wymagalność
- Password: siła hasła (uppercase, lowercase, cyfry)
- Name: min. 2 znaki, wymagalność

**Note schemas:**
- Title: min. 1 znak, max. 200 znaków, wymagalność
- Content: opcjonalność, typ string lub null

**Profile schema:**
- Name: min. 2 znaki
- Preferences: tablica stringów

**Travel plan schema:**
- Struktura dni (day, date, dayOfWeek, title, activities)
- Activities: morning/afternoon/evening opcjonalne
- PriceCategory: enum ["free", "budget", "moderate", "expensive"]

### 3.9. Testy kompatybilności (Compatibility Tests)
**Cel:** Weryfikacja działania w różnych przeglądarkach i urządzeniach

**Narzędzia:** BrowserStack, Playwright (multi-browser)

**Zakres:**
- Przeglądarki: Chrome, Firefox, Safari, Edge (latest + latest-1)
- Urządzenia mobilne: iOS Safari, Chrome Android
- Rozmiary ekranu: mobile (375px), tablet (768px), desktop (1280px, 1920px)

**Przypadki testowe:**
- Responsywność layoutu (Sidebar → MobileNav na < 768px)
- Touch events na urządzeniach mobilnych
- Renderowanie formularzy i komponentów UI
- Obsługa viewport meta tags

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. System autentykacji

#### Scenariusz: Rejestracja nowego użytkownika (Happy Path)
**ID:** TC-AUTH-001  
**Priorytet:** Krytyczny  
**Typ:** E2E

**Kroki:**
1. Przejdź do `/auth/register`
2. Wypełnij formularz:
   - Name: "Jan Kowalski"
   - Email: "jan.kowalski@example.com"
   - Password: "Test123!"
   - Confirm Password: "Test123!"
3. Kliknij "Zarejestruj się"

**Oczekiwany rezultat:**
- Użytkownik zostaje przekierowany do `/app/notes`
- W bazie danych utworzony jest rekord w `auth.users`
- Automatycznie utworzony jest profil w `profiles` (trigger)
- Wyświetlany jest OnboardingModal z preferencjami do uzupełnienia
- Użytkownik widzi przykładową notatkę z planem (onboarding)

**Dane wejściowe:** Prawidłowe dane rejestracji  
**Warunki wstępne:** Użytkownik nie jest zalogowany

---

#### Scenariusz: Rejestracja - duplikat email
**ID:** TC-AUTH-002  
**Priorytet:** Wysoki  
**Typ:** Integracyjny

**Kroki:**
1. Zarejestruj użytkownika z emailem "test@example.com"
2. Wyloguj się
3. Spróbuj zarejestrować ponownie z tym samym emailem

**Oczekiwany rezultat:**
- API zwraca 400 Bad Request
- Formularz wyświetla błąd: "Użytkownik z tym adresem email już istnieje"
- Użytkownik pozostaje na stronie `/auth/register`

---

#### Scenariusz: Logowanie (Happy Path)
**ID:** TC-AUTH-003  
**Priorytet:** Krytyczny  
**Typ:** E2E

**Kroki:**
1. Przejdź do `/auth/login`
2. Wypełnij formularz:
   - Email: "jan.kowalski@example.com"
   - Password: "Test123!"
3. Kliknij "Zaloguj się"

**Oczekiwany rezultat:**
- Użytkownik zostaje przekierowany do `/app/notes`
- Sesja zostaje zapisana w cookies
- Middleware rozpoznaje użytkownika jako zalogowanego

---

#### Scenariusz: Reset hasła - pełny flow
**ID:** TC-AUTH-004  
**Priorytet:** Średni  
**Typ:** E2E

**Kroki:**
1. Na `/auth/login` kliknij "Zapomniałeś hasła?"
2. Wprowadź email: "jan.kowalski@example.com"
3. Kliknij "Wyślij link resetujący"
4. Otwórz email i kliknij w link (z kodem resetującym)
5. Na `/auth/reset-password?code=XXX` wprowadź nowe hasło: "NewPass123!"
6. Kliknij "Zresetuj hasło"

**Oczekiwany rezultat:**
- Po kroku 3: wyświetlony komunikat "Link został wysłany na email"
- Po kroku 6: przekierowanie do `/auth/login` z komunikatem sukcesu
- Logowanie z nowym hasłem działa poprawnie
- Logowanie ze starym hasłem zwraca błąd

**Uwaga:** Wymaga konfiguracji SMTP w Supabase

---

### 4.2. Zarządzanie notatkami

#### Scenariusz: Utworzenie notatki (Happy Path)
**ID:** TC-NOTE-001  
**Priorytet:** Krytyczny  
**Typ:** E2E

**Kroki:**
1. Zaloguj się jako użytkownik
2. Na `/app/notes` kliknij "Nowa notatka"
3. W edytorze wprowadź:
   - Tytuł: "Wycieczka do Krakowa"
   - Treść: "3 dni, centrum miasta, Wawel, Kazimierz, lokalna kuchnia"
4. Poczekaj na autosave (500ms debounce)

**Oczekiwany rezultat:**
- Notatka pojawia się na liście `/app/notes`
- Status autosave: "idle" → "saving" → "success"
- W bazie danych utworzony rekord w `notes` z poprawnym `user_id`
- `created_at` i `updated_at` ustawione automatycznie

---

#### Scenariusz: Edycja notatki z autosave
**ID:** TC-NOTE-002  
**Priorytet:** Wysoki  
**Typ:** Integracyjny

**Kroki:**
1. Otwórz istniejącą notatkę na `/app/notes/[noteId]`
2. Edytuj tytuł: "Wycieczka do Krakowa (EDIT)"
3. Poczekaj 500ms (debounce)
4. Edytuj treść: dodaj "i Wieliczka"
5. Poczekaj 500ms

**Oczekiwany rezultat:**
- Po każdej edycji: autosave wywołuje PUT `/api/notes/[noteId]`
- Status autosave: "saving" → "success"
- Timestamp `updated_at` w bazie zostaje zaktualizowany (trigger)
- Odświeżenie strony pokazuje zaktualizowane dane

---

#### Scenariusz: Usunięcie notatki
**ID:** TC-NOTE-003  
**Priorytet:** Wysoki  
**Typ:** E2E

**Kroki:**
1. Na `/app/notes/[noteId]` kliknij przycisk "Usuń notatkę"
2. Potwierdź w dialogu (modal)

**Oczekiwany rezultat:**
- Wywołanie DELETE `/api/notes/[noteId]`
- Rekord usunięty z bazy danych
- Jeśli notatka miała plan, plan też jest usunięty (CASCADE)
- Przekierowanie do `/app/notes`
- Notatka znika z listy

---

#### Scenariusz: Kopiowanie notatki
**ID:** TC-NOTE-004  
**Priorytet:** Średni  
**Typ:** E2E

**Kroki:**
1. Otwórz notatkę na `/app/notes/[noteId]`
2. Kliknij "Skopiuj notatkę"

**Oczekiwany rezultat:**
- Wywołanie POST `/api/notes/[noteId]/copy`
- Utworzona nowa notatka z tytułem "Kopia - [oryginalny tytuł]"
- Treść skopiowana 1:1
- Plan podróży NIE jest kopiowany (nowa notatka bez planu)
- Przekierowanie do edytora nowej notatki

---

#### Scenariusz: Paginacja listy notatek
**ID:** TC-NOTE-005  
**Priorytet:** Średni  
**Typ:** Integracyjny

**Kroki:**
1. Utwórz 12 notatek jako ten sam użytkownik
2. Przejdź do `/app/notes`
3. Kliknij stronę 2

**Oczekiwany rezultat:**
- Strona 1 wyświetla 10 notatek (limit domyślny)
- Strona 2 wyświetla 2 notatki
- Query string: `?page=2`
- Wywołanie GET `/api/notes?page=2&limit=10`
- Komponenty pagination aktywne (Poprzednia/Następna)

---

### 4.3. Generowanie planów AI

#### Scenariusz: Generowanie planu (Happy Path)
**ID:** TC-PLAN-001  
**Priorytet:** Krytyczny  
**Typ:** E2E

**Kroki:**
1. Otwórz notatkę z treścią (min. 10 słów) bez planu
2. Kliknij "Wygeneruj plan podróży"
3. W modalu wybierz opcje:
   - Styl: Przygoda
   - Transport: Samochód
   - Budżet: Standardowo
4. Kliknij "Generuj"
5. Po wygenerowaniu kliknij "Zapisz do moich podróży"

**Oczekiwany rezultat:**
- Modal loading view podczas generowania (spinner, "Trwa generowanie...")
- Wywołanie POST `/api/notes/[noteId]/generate-plan` z opcjami
- OpenRouterService wysyła request do OpenRouter API
- Zwrócony plan zgodny z TravelPlanContentSchema (Zod validation)
- Wyświetlenie GeneratedPlanView z danymi strukturalnymi:
  - Dni (day, title, activities)
  - Activities podzielone na morning/afternoon/evening
  - PriceCategory dla każdej aktywności
  - Disclaimer na dole planu
- Po zapisaniu: INSERT do `travel_plans` w bazie
- Ikona planu pojawia się na liście notatek

---

#### Scenariusz: Generowanie planu - za krótka notatka
**ID:** TC-PLAN-002  
**Priorytet:** Wysoki  
**Typ:** Integracyjny

**Kroki:**
1. Utwórz notatkę z treścią < 10 słów (np. "Kraków weekend")
2. Kliknij "Wygeneruj plan podróży"

**Oczekiwany rezultat:**
- Przycisk "Wygeneruj plan" jest disabled (nieaktywny)
- Tooltip: "Notatka musi zawierać minimum 10 słów"
- Wywołanie API nie następuje

---

#### Scenariusz: Regeneracja planu z confirm
**ID:** TC-PLAN-003  
**Priorytet:** Wysoki  
**Typ:** E2E

**Kroki:**
1. Otwórz notatkę z już zapisanym planem
2. Kliknij "Wygeneruj nowy plan"
3. W dialogu potwierdzającym kliknij "Tak, nadpisz"
4. Wybierz inne opcje (np. Budżet: Luksusowo)
5. Kliknij "Generuj"
6. Kliknij "Zapisz"

**Oczekiwany rezultat:**
- Dialog ostrzeżenia: "Plan zostanie nadpisany. Kontynuować?"
- Wywołanie PUT `/api/notes/[noteId]/travel-plan` z `confirm: true`
- Stary plan nadpisany (UPDATE w bazie)
- `updated_at` zaktualizowany
- Nowy plan wyświetlony w interfejsie

---

#### Scenariusz: Błąd API OpenRouter (rate limit)
**ID:** TC-PLAN-004  
**Priorytet:** Średni  
**Typ:** Integracyjny

**Kroki:**
1. Symuluj przekroczenie rate limitu OpenRouter (429 status)
2. Spróbuj wygenerować plan

**Oczekiwany rezultat:**
- OpenRouterService rzuca RateLimitError
- API endpoint zwraca 429 Too Many Requests
- Frontend wyświetla ErrorView z komunikatem: "Przekroczono limit żądań. Spróbuj ponownie za chwilę."
- Przycisk "Spróbuj ponownie"

---

#### Scenariusz: Walidacja struktury planu (Zod)
**ID:** TC-PLAN-005  
**Priorytet:** Wysoki  
**Typ:** Jednostkowy

**Kroki:**
1. Test jednostkowy: podaj JSON z brakującym polem `day`
2. Wywołaj `TravelPlanContentSchema.safeParse(invalidData)`

**Oczekiwany rezultat:**
- `success: false`
- `error.issues` zawiera szczegóły błędu walidacji
- W produkcji: SchemaValidationError w OpenRouterService → retry (jeśli < max attempts)

---

### 4.4. Zarządzanie profilem

#### Scenariusz: Edycja preferencji (Happy Path)
**ID:** TC-PROFILE-001  
**Priorytet:** Wysoki  
**Typ:** E2E

**Kroki:**
1. Przejdź do `/app/profile`
2. W sekcji "Preferencje podróżnicze" zaznacz:
   - Styl podróży: "Z plecakiem"
   - Zainteresowania: "Historia", "Sztuka"
   - Kuchnia: "Włoska", "Japońska"
   - Tempo: "Intensywne"
3. Kliknij "Zapisz preferencje"

**Oczekiwany rezultat:**
- Wywołanie PUT `/api/profiles/me` z `preferences: ["Z plecakiem", "Historia", ...]`
- W bazie `profiles.preferences` (JSONB) zaktualizowane
- Toast: "Preferencje zostały zaktualizowane"
- Preferencje wykorzystywane przy kolejnym generowaniu planu (system prompt w TravelPlanService)

---

#### Scenariusz: Zmiana nazwy użytkownika
**ID:** TC-PROFILE-002  
**Priorytet:** Średni  
**Typ:** Integracyjny

**Kroki:**
1. Na `/app/profile` w polu "Imię" zmień na "Anna Nowak"
2. Kliknij "Zapisz"

**Oczekiwany rezultat:**
- Wywołanie PUT `/api/profiles/me` z `name: "Anna Nowak"`
- W bazie `profiles.name` zaktualizowana
- UI wyświetla nową nazwę (np. w Sidebar "Witaj, Anna")

---

#### Scenariusz: Zmiana hasła
**ID:** TC-PROFILE-003  
**Priorytet:** Wysoki  
**Typ:** E2E

**Kroki:**
1. Na `/app/profile` w sekcji "Zmiana hasła":
   - Current password: "Test123!"
   - New password: "NewSecure456!"
   - Confirm new password: "NewSecure456!"
2. Kliknij "Zmień hasło"

**Oczekiwany rezultat:**
- Wywołanie PUT `/api/auth/password`
- Supabase Auth weryfikuje stare hasło i aktualizuje do nowego
- Toast: "Hasło zostało zmienione"
- Wylogowanie i ponowne logowanie z nowym hasłem działa

---

#### Scenariusz: Usunięcie konta
**ID:** TC-PROFILE-004  
**Priorytet:** Wysoki  
**Typ:** E2E

**Kroki:**
1. Na `/app/profile` kliknij "Usuń konto"
2. W dialogu potwierdzającym wpisz hasło: "Test123!"
3. Kliknij "Usuń konto na zawsze"

**Oczekiwany rezultat:**
- Wywołanie DELETE `/api/profiles/me`
- Rekord w `auth.users` usunięty
- CASCADE delete usuwa wszystkie powiązane dane:
  - Profil (`profiles`)
  - Notatki (`notes`)
  - Plany (`travel_plans`)
- Użytkownik wylogowany i przekierowany do `/auth/login`
- Toast: "Konto zostało usunięte"

---

### 4.5. Onboarding nowych użytkowników

#### Scenariusz: Onboarding - automatyczna notatka przykładowa
**ID:** TC-ONBOARD-001  
**Priorytet:** Wysoki  
**Typ:** E2E

**Kroki:**
1. Zarejestruj nowego użytkownika
2. Po przekierowaniu do `/app/notes` sprawdź listę

**Oczekiwany rezultat:**
- Na liście notatek widoczna jest notatka "Przykładowa wycieczka do Warszawy"
- Notatka zawiera treść z przykładowymi informacjami
- Notatka posiada już wygenerowany plan (ikona planu widoczna)
- Użytkownik może otworzyć i przeglądać przykładowy plan
- Notatka jest edytowalna i usuwalna (jak zwykła notatka)

**Uwaga:** Wymaga zaimplementowania logiki onboarding w triggerze bazy danych lub endpoint rejestracji

---

#### Scenariusz: OnboardingModal z preferencjami
**ID:** TC-ONBOARD-002  
**Priorytet:** Średni  
**Typ:** E2E

**Kroki:**
1. Po rejestracji wyświetlany jest OnboardingModal
2. Wybierz co najmniej 3 preferencje
3. Kliknij "Kontynuuj"

**Oczekiwany rezultat:**
- Modal zamknięty
- Preferencje zapisane w profilu (PUT `/api/profiles/me`)
- Banner zachęcający do wypełnienia profilu nie wyświetla się (warunek: >= 3 preferencje)

---

### 4.6. RLS i bezpieczeństwo

#### Scenariusz: RLS - próba dostępu do cudzej notatki
**ID:** TC-SEC-001  
**Priorytet:** Krytyczny  
**Typ:** Bezpieczeństwa

**Kroki:**
1. Zaloguj się jako Użytkownik A
2. Utwórz notatkę (ID: `note-a-123`)
3. Zaloguj się jako Użytkownik B
4. Spróbuj wywołać GET `/api/notes/note-a-123`

**Oczekiwany rezultat:**
- API zwraca 404 Not Found (nie 403, aby nie ujawniać istnienia)
- RLS policy blokuje SELECT dla `user_id != auth.uid()`
- Baza danych nie zwraca żadnych danych

---

#### Scenariusz: RLS - próba modyfikacji cudzego profilu
**ID:** TC-SEC-002  
**Priorytet:** Krytyczny  
**Typ:** Bezpieczeństwa

**Kroki:**
1. Jako Admin (z dostępem do bazy) uzyskaj UUID Użytkownika A
2. Zaloguj się jako Użytkownik B
3. Spróbuj wywołać PUT `/api/profiles/me` podszywając się (przez modyfikację request)

**Oczekiwany rezultat:**
- RLS policy `auth.uid() = id` blokuje UPDATE
- API zwraca 403 Forbidden lub 400 Bad Request
- Dane Użytkownika A pozostają niezmienione

---

#### Scenariusz: Middleware - dostęp bez logowania
**ID:** TC-SEC-003  
**Priorytet:** Krytyczny  
**Typ:** Bezpieczeństwa

**Kroki:**
1. Wyloguj się (clear cookies)
2. Spróbuj wejść na `/app/notes`

**Oczekiwany rezultat:**
- Middleware wykrywa brak sesji (`user === null`)
- Przekierowanie do `/auth/login?redirect=/app/notes`
- Po zalogowaniu: przekierowanie z powrotem do `/app/notes`

---

## 5. Środowisko testowe

### 5.1. Środowiska
- **Development:** Local (localhost:3000) - Supabase local instance
- **Staging:** Testowa instancja na DigitalOcean - Supabase cloud (testowa)
- **Production:** Produkcyjna instancja - Supabase cloud (produkcja)

### 5.2. Konfiguracja testowa

**Baza danych:**
- Testowa instancja Supabase z repliką schematu produkcyjnego
- Seed data: 3 użytkowników testowych, 10 notatek, 5 planów
- Automatyczne czyszczenie po testach E2E (teardown)

**API Zewnętrzne:**
- OpenRouter.ai: klucz testowy z limitem (OPENROUTER_API_KEY_TEST)
- Mock responses dla testów jednostkowych i integracyjnych

**Zmienne środowiskowe (.env.test):**
```
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
OPENROUTER_API_KEY=test-openrouter-key
DEFAULT_USER_ID=test-user-uuid
```

### 5.3. Dane testowe

**Użytkownicy:**
- `test-user-1@example.com` (hasło: TestPass123!)
  - Profil: Jan Kowalski, preferencje: ["Historia", "Włoska kuchnia"]
  - 5 notatek, 2 plany
  
- `test-user-2@example.com` (hasło: TestPass123!)
  - Profil: Anna Nowak, preferencje: ["Przyroda", "Aktywnie"]
  - 3 notatki, 1 plan

- `test-admin@example.com` (hasło: AdminPass123!)
  - Profil: Admin
  - Uprawnienia: dostęp do wszystkich danych (do testów RLS)

**Notatki przykładowe:**
- "Wycieczka do Krakowa" (120 słów, plan 3-dniowy)
- "Weekend w górach" (80 słów, bez planu)
- "Krótka notatka" (5 słów, do testów walidacji)

## 6. Narzędzia do testowania

### 6.1. Framework testowy
- **Vitest** - testy jednostkowe i integracyjne
  - Szybki, kompatybilny z Vite
  - Wbudowane mockowanie i coverage

### 6.2. Testy E2E
- **Playwright** - testy end-to-end
  - Multi-browser support (Chromium, Firefox, WebKit)
  - Network interception, screenshots, videos

### 6.3. Testy komponentów
- **React Testing Library** - testy komponentów React
  - User-centric testing
  - Accessibility queries

### 6.4. Testy API
- **Vitest + fetch** - testy REST API
  - Bezpośrednie wywołania endpoints
  - Mockowanie Supabase client

### 6.5. Accessibility
- **axe-core** - audyt dostępności
- **Lighthouse CI** - automatyczne audyty w CI/CD
- **NVDA / VoiceOver** - manualne testy czytników ekranu

### 6.6. Performance
- **Lighthouse** - metryki wydajności, accessibility, best practices
- **Web Vitals** - monitoring Core Web Vitals

### 6.7. Code Quality
- **ESLint** - linting kodu (wbudowany)
- **Prettier** - formatowanie kodu
- **TypeScript** - statyczna analiza typów

### 6.8. CI/CD
- **GitHub Actions** - automatyczne uruchamianie testów
  - Testy jednostkowe: przy każdym push
  - Testy E2E: przy pull request
  - Lighthouse: przed deployment

## 7. Harmonogram testów

### 7.1. Faza 1: Testy jednostkowe (Tydzień 1-2)
- [ ] Schematy Zod (auth, notes, profiles, travel-plan)
- [ ] Funkcje pomocnicze (utils, formatowanie dat)
- [ ] Serwisy: TravelPlanService.validateNoteContent()
- [ ] Komponenty UI (Button, Input, Select)
- **Cel:** 80% code coverage dla src/lib/

### 7.2. Faza 2: Testy integracyjne (Tydzień 2-3)
- [ ] API endpoints (wszystkie 17 endpointów)
- [ ] Middleware + Supabase Auth
- [ ] OpenRouterService + mock API
- [ ] Database queries + RLS policies
- **Cel:** Pokrycie wszystkich happy paths i error cases

### 7.3. Faza 3: Testy E2E (Tydzień 3-4)
- [ ] Scenariusze krytyczne (auth, notes CRUD, plan generation)
- [ ] Onboarding flow
- [ ] Profile management
- [ ] Edge cases (paginacja, kopiowanie, regeneracja)
- **Cel:** 15-20 scenariuszy E2E w Playwright

### 7.4. Faza 4: Testy bezpieczeństwa (Tydzień 4)
- [ ] RLS policies (profiles, notes, travel_plans)
- [ ] Middleware guards
- [ ] CSRF protection
- [ ] SQL injection attempts
- **Cel:** Brak krytycznych luk bezpieczeństwa

### 7.5. Faza 5: Testy accessibility (Tydzień 5)
- [ ] Audyt axe-core dla wszystkich stron
- [ ] Nawigacja klawiaturą
- [ ] Czytnik ekranu (NVDA/VoiceOver)
- [ ] Kontrast kolorów
- **Cel:** WCAG 2.1 Level AA compliance

### 7.6. Faza 6: Testy wydajnościowe i kompatybilności (Tydzień 5-6)
- [ ] Lighthouse dla kluczowych stron
- [ ] Responsywność (mobile, tablet, desktop)
- [ ] Multi-browser (Chrome, Firefox, Safari, Edge)
- [ ] Load testing (generowanie planów dla wielu użytkowników)
- **Cel:** Lighthouse Performance > 90, brak błędów w głównych przeglądarkach

### 7.7. Regression Testing (Ciągły)
- [ ] Automatyczne uruchamianie testów jednostkowych przy każdym commit
- [ ] Testy E2E przed każdym release
- [ ] Monitoring błędów w produkcji (Sentry / podobne)

## 8. Kryteria akceptacji testów

### 8.1. Kryteria jakościowe
- **Code coverage:** > 80% dla src/lib/, > 60% dla src/components/
- **Testy jednostkowe:** Wszystkie kluczowe funkcje pokryte testami
- **Testy E2E:** Min. 15 scenariuszy pokrywających user journeys
- **Brak critical bugs:** 0 błędów krytycznych przed release

### 8.2. Kryteria wydajnościowe
- **Lighthouse Performance:** > 90 dla stron głównych
- **API response time:** < 200ms dla CRUD (bez AI), < 15s dla generowania planu
- **Autosave debounce:** 500ms (testowane w performance tests)

### 8.3. Kryteria bezpieczeństwa
- **RLS policies:** 100% pokrycie dla wszystkich tabel
- **Middleware guards:** Wszystkie protected routes zabezpieczone
- **Secrets:** Klucze API tylko server-side (nie w client bundle)

### 8.4. Kryteria dostępności
- **axe-core:** 0 critical i serious issues
- **WCAG 2.1 AA:** Compliance dla formularzy, nawigacji, content
- **Keyboard navigation:** Wszystkie funkcje dostępne bez myszy

### 8.5. Kryteria funkcjonalne (zgodność z PRD)
- [ ] US-001: Rejestracja użytkownika ✅
- [ ] US-002: Logowanie użytkownika ✅
- [ ] US-003: Reset hasła ✅
- [ ] US-004: Zarządzanie profilem (edycja, preferencje, usunięcie) ✅
- [ ] US-005: Tworzenie notatek ✅
- [ ] US-006: Edycja notatek z autosave ✅
- [ ] US-007: Usuwanie notatek ✅
- [ ] US-008: Paginacja i sortowanie listy notatek ✅
- [ ] US-009: Kopiowanie notatek ✅
- [ ] US-010: Generowanie planu AI ✅
- [ ] US-011: Zapis planu ✅
- [ ] US-012: Personalizacja generowania (styl, transport, budżet) ✅
- [ ] US-013: Onboarding z przykładową notatką ✅

## 9. Role i odpowiedzialności w procesie testowania

### 9.1. QA Engineer (Właściciel planu testów)
- Koordynacja wszystkich aktywności testowych
- Tworzenie i utrzymanie test cases
- Wykonywanie testów manualnych (E2E, accessibility)
- Raportowanie błędów i tracking issues
- Code review dla test code

### 9.2. Backend Developer
- Implementacja testów jednostkowych dla serwisów
- Testy integracyjne API endpoints
- Testy RLS policies i database queries
- Mockowanie zewnętrznych API (OpenRouter)

### 9.3. Frontend Developer
- Testy jednostkowe komponentów React
- Testy integracyjne hooków i state management
- Accessibility testing (axe, keyboard navigation)
- Responsive design testing

### 9.4. DevOps Engineer
- Konfiguracja CI/CD pipeline (GitHub Actions)
- Setup środowisk testowych (Staging)
- Automatyzacja testów w pipeline
- Monitoring i logging

### 9.5. Product Owner / Project Manager
- Akceptacja wyników testów
- Priorytetyzacja bugfixów
- Decyzje go/no-go przed release
- Review kryteriów akceptacji

## 10. Procedury raportowania błędów

### 10.1. Szablon raportu błędu (GitHub Issues)

```markdown
## 🐛 Opis błędu
[Krótki, jasny opis problemu]

## 📝 Kroki do reprodukcji
1. 
2. 
3. 

## ✅ Oczekiwane zachowanie
[Co powinno się stać]

## ❌ Aktualne zachowanie
[Co się dzieje obecnie]

## 🖼️ Zrzuty ekranu / Logi
[Załącz jeśli dotyczy]

## 🌐 Środowisko
- OS: [np. Windows 11, macOS 14]
- Przeglądarka: [np. Chrome 120, Firefox 121]
- Wersja aplikacji: [np. v1.2.0]
- Środowisko: [Development / Staging / Production]

## 🔥 Priorytet
- [ ] Critical (blokuje core functionality)
- [ ] High (ważna funkcja nie działa)
- [ ] Medium (problem UX / minor bug)
- [ ] Low (kosmetyczny)

## 🏷️ Kategoria
- [ ] Backend (API)
- [ ] Frontend (UI)
- [ ] Database
- [ ] Security
- [ ] Performance
- [ ] Accessibility

## 📋 ID Scenariusza Testowego
[np. TC-AUTH-001]
```

### 10.2. Workflow raportowania

1. **Znalezienie błędu:** Tester dokumentuje zgodnie z szablonem
2. **Triage:** Product Owner + QA Engineer ustalają priorytet
3. **Assignment:** Przydział do odpowiedniego developera
4. **Fix:** Developer naprawia i tworzy pull request
5. **Verification:** QA Engineer weryfikuje fix na staging
6. **Closure:** Issue zamknięty po pomyślnej weryfikacji
7. **Regression:** Dodanie test case do regression suite

### 10.3. Severity Levels

**Critical (P0):**
- Aplikacja nie działa (crash, nie uruchamia się)
- Utrata danych użytkownika
- Luka bezpieczeństwa (RLS bypass, XSS)
- **SLA:** Fix w ciągu 24h

**High (P1):**
- Kluczowa funkcja nie działa (np. nie można wygenerować planu)
- Błąd uniemożliwiający completion user story
- **SLA:** Fix w ciągu 3 dni

**Medium (P2):**
- Funkcja działa, ale z błędami UX
- Błędy walidacji, błędne komunikaty
- **SLA:** Fix w następnym sprint

**Low (P3):**
- Kosmetyczne błędy UI
- Typos, drobne błędy formatowania
- **SLA:** Fix gdy czas pozwala

### 10.4. Narzędzia do trackingu
- **GitHub Issues:** Główne narzędzie do reportowania i trackingu
- **GitHub Projects:** Board z kolumnami (Backlog, To Do, In Progress, Testing, Done)
- **Labels:** `bug`, `p0-critical`, `p1-high`, `p2-medium`, `p3-low`, `backend`, `frontend`, `security`, etc.

---

## 11. Podsumowanie i wnioski

### 11.1. Kluczowe obszary testowe
1. **Bezpieczeństwo (RLS, Auth)** - priorytet krytyczny
2. **Generowanie planów AI** - core functionality
3. **CRUD notatek** - podstawowa funkcjonalność
4. **Accessibility** - zgodność z WCAG 2.1 AA
5. **Performance** - czas generowania planów, autosave

### 11.2. Ryzyka i mitygacja

**Ryzyko:** OpenRouter API niestabilne lub zbyt wolne  
**Mitygacja:** Mockowanie w testach, monitoring czasu odpowiedzi, fallback model

**Ryzyko:** RLS policies źle skonfigurowane (data leaks)  
**Mitygacja:** Dedykowane testy bezpieczeństwa, code review polityk

**Ryzyko:** Niska jakość planów generowanych przez AI  
**Mitygacja:** Testy struktury (Zod), manual testing przykładowych planów, iteracja promptów

**Ryzyko:** Autosave konflikty (race conditions)  
**Mitygacja:** Debounce 500ms, testy concurrent edits, optimistic UI updates

### 11.3. Metryki sukcesu projektu testowego
- **Pokrycie testami:** > 80% code coverage
- **Znalezione bugi:** Min. 20 bugów przed release (wskaźnik dokładności testów)
- **Regression rate:** < 5% (bugi ponownie występujące)
- **Release quality:** 0 critical bugs w produkcji w ciągu pierwszego miesiąca

### 11.4. Continuous Improvement
- **Retrospektywy testowe:** Po każdym sprint
- **Aktualizacja test cases:** Na podstawie production bugs
- **Automatyzacja:** Zwiększanie pokrycia testów automatycznych (zmniejszanie manualnych)
- **Monitoring produkcji:** Sentry / LogRocket dla real-user monitoring

---

**Data utworzenia planu:** 2025-11-05  
**Wersja:** 1.0  
**Autor:** QA Team - VibeTravels

**Ostatnia aktualizacja:** 2025-11-05
