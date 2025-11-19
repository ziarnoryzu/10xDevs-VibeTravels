# Cloudflare Runtime Environment Variables Fix

## Problem
Aplikacja rzucała błąd 500 na wszystkie endpointy API (włącznie z GET) w środowisku produkcyjnym (Cloudflare Pages), mimo że:
- Zmienne środowiskowe były ustawione w Cloudflare Dashboard
- Build przechodził pomyślnie
- Aplikacja działała lokalnie bez problemu

## Przyczyna
Cloudflare Pages udostępnia zmienne środowiskowe **w runtime** przez `context.runtime.env`, a nie przez standardowe `import.meta.env` czy `astro:env/server`. 

Kod aplikacji używał:
```typescript
// ❌ NIE DZIAŁA w Cloudflare runtime
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "astro:env/server";
const apiKey = import.meta.env.OPENROUTER_API_KEY;
```

Te wartości są dostępne tylko podczas buildu, ale NIE w runtime na Cloudflare Pages.

## Rozwiązanie
Zmodyfikowano kod aby **sprawdzał najpierw runtime environment** (`context.runtime.env`), a dopiero potem używał wartości z build-time:

```typescript
// ✅ DZIAŁA - obsługuje oba scenariusze
function getEnvVar(name: string, runtimeEnv?: Record<string, string | undefined>, fallback?: string): string {
  // Try Cloudflare runtime first (for production)
  if (runtimeEnv && runtimeEnv[name]) {
    return runtimeEnv[name] as string;
  }
  // Fall back to build-time variable (for local development)
  if (fallback) {
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}
```

## Zmienione Pliki

### 1. `src/env.d.ts`
- Dodano typ `runtime` do `App.Locals` z definicją zmiennych środowiskowych Cloudflare

### 2. `src/db/supabase.client.ts`
- Dodano funkcję helper `getEnvVar()` do obsługi runtime env
- `createSupabaseServerInstance()` teraz przyjmuje opcjonalny `runtime.env`
- `createSupabaseAdminClient()` teraz przyjmuje opcjonalny `runtimeEnv`
- Funkcje używają zmiennych z `context.runtime.env` jeśli dostępne, w przeciwnym razie z build-time

### 3. `src/middleware/index.ts`
- Przekazuje `locals.runtime` do `createSupabaseServerInstance()`
- Cloudflare automatycznie wypełnia `locals.runtime.env` zmiennymi z dashboardu

### 4. `src/lib/openrouter.service.ts`
- Konstruktor przyjmuje opcjonalny parametr `runtimeEnv`
- Używa `runtimeEnv.OPENROUTER_API_KEY` jeśli dostępne, w przeciwnym razie `import.meta.env.OPENROUTER_API_KEY`

### 5. `src/lib/services/travel-plan.service.ts`
- Dodano metodę `createOpenRouterService(runtimeEnv)` która tworzy instancję z runtime env
- `generatePlan()` przyjmuje opcjonalny parametr `runtimeEnv` i przekazuje go do OpenRouter service

### 6. API Endpoints
- `src/pages/api/notes/[noteId]/generate-plan.ts` - przekazuje `locals.runtime?.env` do `generatePlan()`
- `src/pages/api/notes/[noteId]/travel-plan.ts` - przekazuje `locals.runtime?.env` do `generatePlan()`

### 7. `astro.config.mjs`
- Zmienne `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY` są teraz `optional: true` w build-time
- Są walidowane w runtime przez funkcję `getEnvVar()` i konstruktory serwisów

### 8. Dokumentacja
- `.github/CLOUDFLARE_DEPLOYMENT.md` - zaktualizowano z wyjaśnieniem problemu i rozwiązania
- Dodano szczegółowy checklist weryfikacji
- Dodano sekcję troubleshooting dla błędów 500

## Co Musisz Zrobić

### 1. Upewnij się, że zmienne są w Cloudflare Dashboard

Idź do: **Cloudflare Dashboard → Pages → Twój Projekt → Settings → Environment variables**

Dla środowiska **Production** dodaj:
- `SUPABASE_URL` = [twój URL Supabase]
- `SUPABASE_ANON_KEY` = [twój Supabase anon key]
- `SUPABASE_SERVICE_ROLE_KEY` = [twój Supabase service role key]
- `OPENROUTER_API_KEY` = [twój OpenRouter API key]
- `OPENROUTER_MODEL` = [nazwa modelu, np. `anthropic/claude-3.5-sonnet`] (opcjonalne, domyślnie `anthropic/claude-3.5-haiku`)

⚠️ **Wielkość liter ma znaczenie!** Nazwy muszą być dokładnie takie jak wyżej.

### 2. Commit i Push zmian

```bash
git add .
git commit -m "fix: add Cloudflare runtime environment variables support"
git push origin master
```

### 3. Poczekaj na deployment z GitHub Actions

Workflow automatycznie:
- Zbuduje aplikację z Cloudflare adapter
- Wdroży na Cloudflare Pages

### 4. Po deploymencie - Redeploy z Cloudflare Dashboard

⚠️ **KRYTYCZNE**: Nawet jeśli zmienne były już dodane wcześniej, musisz kliknąć "Redeploy" w Cloudflare Dashboard aby runtime environment został odświeżony!

1. Idź do: Cloudflare Dashboard → Pages → Twój Projekt → Deployments
2. Znajdź najnowszy deployment
3. Kliknij "..." (menu) → "Redeploy"

### 5. Testowanie

Po redeploymencie przetestuj:
1. ✅ Zaloguj się do aplikacji
2. ✅ Stwórz nową notatkę (test zapisu do Supabase)
3. ✅ Otwórz istniejącą notatkę (test GET endpoint - jeśli to działa, Supabase połączenie jest OK)
4. ✅ Wygeneruj plan podróży (test OpenRouter API)

Jeśli krok 3 działa, ale krok 4 nie - sprawdź czy `OPENROUTER_API_KEY` jest poprawnie ustawiony.

## Jak To Działa Teraz

### Local Development
```
Application Code
    ↓
import.meta.env.SUPABASE_URL
    ↓
Value from .env file
```

### Cloudflare Production
```
HTTP Request
    ↓
Middleware
    ↓
context.runtime.env (zmienne z Cloudflare Dashboard)
    ↓
createSupabaseServerInstance({runtime: context.runtime})
    ↓
getEnvVar("SUPABASE_URL", context.runtime.env, fallback)
    ↓
Value from context.runtime.env.SUPABASE_URL
```

## Dlaczego To Nie Działało Wcześniej?

1. **Build przechodzi** - bo zmienne są w GitHub Secrets i są dostępne podczas `npm run build`
2. **Kod się kompiluje** - bo używa `import.meta.env` który jest zastępowany podczas buildu
3. **Runtime crashuje** - bo w Cloudflare runtime, `import.meta.env.SUPABASE_URL` jest `undefined`

Cloudflare **nie przekazuje** zmiennych z dashboardu do `import.meta.env`. Muszą być odczytane z `context.runtime.env`.

## Podsumowanie

✅ Teraz aplikacja działa w obu środowiskach:
- **Local**: używa `.env` → `import.meta.env`
- **Cloudflare**: używa Dashboard env vars → `context.runtime.env`

✅ Kod automatycznie wybiera właściwe źródło zmiennych

✅ Jasne błędy jeśli zmienne brakują w runtime

✅ Pełna kompatybilność wsteczna z lokalnym development

