# Kontekst: Naprawienie flow usuwania konta w aplikacji VibeTravels

## Co zostało zrobione:

1. **Naprawiono DELETE /api/profiles/me:**
   - Dodano signOut() przed usunięciem
   - Zastąpiono manualne czyszczenie na RPC delete_user_account()
   - Funkcja SQL delete_user_account() w migracji 20251118000000_cleanup_zombie_accounts.sql
   - Używa SECURITY DEFINER do usunięcia z auth.users z CASCADE

2. **Naprawiono redirect:**
   - useProfile.ts: zmieniono redirect na Routes.auth.login()

3. **Dodano 410 Gone:**
   - GET/PUT /api/profiles/me zwraca 410 Gone dla zombie users

4. **Obejście triggera:**
   - /api/auth/register tworzy profil ręcznie (linie 115-130)
   - Potrzebne bo trigger on_auth_user_created jest disabled lokalnie

## Co TRZEBA ZROBIĆ:

### ✅ ZAKOŃCZONE: Utworzono narzędzia i migracje

Utworzono następujące pliki pomocnicze:

1. **supabase/scripts/check_trigger_status.sql**
   - Skrypt SQL do sprawdzenia statusu triggera w produkcji
   - Weryfikuje czy `on_auth_user_created` jest włączony
   - Wykrywa zombie accounts
   - Zawiera przewodnik interpretacji wyników

2. **supabase/migrations/20251118120000_enable_rls_for_production.sql**
   - Migracja do włączenia RLS w produkcji
   - Przywraca wszystkie polityki bezpieczeństwa
   - Weryfikuje że `delete_user_account()` działa z RLS
   - Zawiera checklist testów po-migracyjnych

3. **supabase/scripts/cleanup_manual_profile_creation.md**
   - Przewodnik jak usunąć ręczne tworzenie profilu
   - Zawiera dokładne instrukcje co usunąć z `/api/auth/register`
   - Zawiera testy weryfikujące że trigger działa
   - Zawiera alternatywne podejście z redundancją

### 📋 CHECKLIST WDROŻENIA NA PRODUKCJĘ

#### Faza 1: Przed wdrożeniem
- [ ] Upewnij się że wszystkie migracje są w katalogu `supabase/migrations/`
- [ ] Przetestuj flow usuwania konta lokalnie
- [ ] Zweryfikuj że nie ma istniejących zombie accounts lokalnie

#### Faza 2: Wdrożenie na Supabase Cloud
- [ ] Deploy projektu na Supabase Cloud
- [ ] Upewnij się że wszystkie migracje zostały zastosowane
- [ ] Sprawdź logi migracji w Supabase Dashboard

#### Faza 3: Weryfikacja triggera
- [ ] Uruchom `supabase/scripts/check_trigger_status.sql` w SQL Editor
- [ ] Sprawdź czy trigger `on_auth_user_created` jest włączony
- [ ] Jeśli wyłączony, włącz: `ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;`
- [ ] Przetestuj rejestrację nowego użytkownika
- [ ] Zweryfikuj że profil jest automatycznie tworzony przez trigger

#### Faza 4: Opcjonalnie - Usunięcie workaround'u
- [ ] Jeśli trigger działa poprawnie (z Faza 3)
- [ ] Usuń ręczne tworzenie profilu z `src/pages/api/auth/register.ts` (linie 115-130)
- [ ] Postępuj zgodnie z `supabase/scripts/cleanup_manual_profile_creation.md`
- [ ] Przetestuj rejestrację po zmianach
- [ ] Deploy zaktualizowanego kodu

#### Faza 5: Włączenie RLS
- [ ] **WAŻNE**: Wykonaj to dopiero po weryfikacji że trigger działa!
- [ ] Zastosuj migrację: `20251118120000_enable_rls_for_production.sql`
- [ ] Przetestuj:
  - [ ] Rejestrację użytkownika
  - [ ] Logowanie
  - [ ] Odczyt profilu (`GET /api/profiles/me`)
  - [ ] Aktualizację profilu (`PUT /api/profiles/me`)
  - [ ] Usunięcie konta (`DELETE /api/profiles/me`)
  - [ ] Tworzenie/odczyt notatek
  - [ ] Tworzenie/odczyt planów podróży
- [ ] Zweryfikuj że użytkownicy nie mogą dostać się do danych innych użytkowników

#### Faza 6: Czyszczenie i monitoring
- [ ] Uruchom cleanup zombie accounts: `SELECT public.cleanup_zombie_accounts();`
- [ ] Monitoruj logi przez pierwsze 24h po wdrożeniu
- [ ] Sprawdź czy nie pojawiają się nowe zombie accounts
- [ ] Przetestuj flow usuwania konta z różnych scenariuszy

### ⚠️ WAŻNE UWAGI

1. **NIE włączaj RLS przed weryfikacją triggera** - inaczej rejestracja może przestać działać
2. **NIE usuwaj ręcznego tworzenia profilu dopóki trigger nie jest zweryfikowany** w produkcji
3. **Przetestuj dokładnie po każdej fazie** przed przejściem do następnej
4. **W razie problemów:** zobacz sekcję "If Issues Occur" w `cleanup_manual_profile_creation.md`

### Zadanie 1: ✅ Sprawdź trigger w produkcji
Użyj: `supabase/scripts/check_trigger_status.sql`

### Zadanie 2: ✅ Włącz RLS przed produkcją  
Użyj: `supabase/migrations/20251118120000_enable_rls_for_production.sql`

## Pliki zmienione:
- src/pages/api/profiles/me.ts (DELETE endpoint)
- src/components/hooks/useProfile.ts (redirect)
- src/pages/api/auth/register.ts (manual profile creation)
- supabase/migrations/20251118000000_cleanup_zombie_accounts.sql (nowa)

## Tech stack:
- Astro 5, React 19, TypeScript 5, Supabase (lokalne dev)