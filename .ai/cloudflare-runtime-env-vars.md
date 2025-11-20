# Cloudflare Runtime Environment Variables - Implementation Guide

## Problem

Aplikacja rzucała błąd 500 na wszystkie endpointy API (włącznie z GET) w środowisku produkcyjnym (Cloudflare Pages), mimo że:
- Zmienne środowiskowe były ustawione w Cloudflare Dashboard
- Build przechodził pomyślnie
- Aplikacja działała lokalnie bez problemu

## Przyczyna

Cloudflare Pages udostępnia zmienne środowiskowe **w runtime** przez `context.runtime.env`, a nie przez standardowe `import.meta.env` czy `astro:env/server`. 

Kod aplikacji początkowo używał tylko:
```typescript
// ❌ NIE DZIAŁA w Cloudflare runtime (gdy brak wartości build-time)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "astro:env/server";
```

Te wartości są dostępne podczas buildu, ale w Cloudflare runtime **muszą być odczytane z `context.runtime.env`**.

## Rozwiązanie

Aplikacja używa **fallback pattern** - sprawdza najpierw runtime environment (`context.runtime.env`), a dopiero potem używa wartości z build-time:

```typescript
// ✅ DZIAŁA - obsługuje oba scenariusze (Cloudflare runtime i local dev)
const supabaseUrl = (context.runtime?.env.SUPABASE_URL || SUPABASE_URL) as string;
const supabaseAnonKey = (context.runtime?.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY) as string;
```

### Dlaczego to działa?

1. **Cloudflare Production**: `context.runtime.env.SUPABASE_URL` zawiera wartość z Cloudflare Dashboard
2. **Local Development**: `context.runtime` jest `undefined`, więc używa `SUPABASE_URL` z `.env` (przez `astro:env/server`)
3. **Type Safety**: `as string` informuje TypeScript że wartość jest gwarantowana (Astro wymaga tych zmiennych przy starcie)

## Implementacja w Projekcie

### 1. `src/env.d.ts`
Dodano typ `runtime` do `App.Locals` z definicją zmiennych środowiskowych Cloudflare:

```typescript
interface Locals {
  supabase: SupabaseClient;
  user: { id: string; email: string } | undefined;
  runtime?: {
    env: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
      OPENROUTER_API_KEY?: string;
      OPENROUTER_MODEL?: string;
    };
  };
}
```

### 2. `src/db/supabase.client.ts`
Używa prostego fallback pattern (bez pomocniczych funkcji):

```typescript
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
  runtime?: { env: Record<string, string | undefined> };
}) => {
  // Prefer runtime values (Cloudflare Pages) over build-time values
  const supabaseUrl = (context.runtime?.env.SUPABASE_URL || SUPABASE_URL) as string;
  const supabaseAnonKey = (context.runtime?.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY) as string;
  
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    // ... config
  });
};

export const createSupabaseAdminClient = (runtimeEnv?: Record<string, string | undefined>) => {
  const supabaseUrl = (runtimeEnv?.SUPABASE_URL || SUPABASE_URL) as string;
  const supabaseServiceRoleKey = (runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY) as string;
  
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    // ... config
  });
};
```

### 3. `src/middleware/index.ts`
Przekazuje `locals.runtime` do `createSupabaseServerInstance()`:

```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  const { locals, cookies, request } = context;
  
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    runtime: (locals as { runtime?: { env: Record<string, string | undefined> } }).runtime,
  });
  
  // Cloudflare automatycznie wypełnia locals.runtime.env zmiennymi z dashboardu
  // ...
});
```

### 4. `src/lib/openrouter.service.ts`
Konstruktor przyjmuje opcjonalny parametr `runtimeEnv`:

```typescript
constructor(runtimeEnv?: Record<string, string | undefined>) {
  this.apiKey = runtimeEnv?.OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;
  
  if (!this.apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }
}
```

### 5. `src/lib/services/travel-plan.service.ts`
Tworzy `OpenRouterService` z runtime env i przekazuje model:

```typescript
private createOpenRouterService(runtimeEnv?: Record<string, string | undefined>): OpenRouterService {
  return new OpenRouterService(runtimeEnv);
}

async generatePlan(noteContent: string, options?: TravelPlanOptions, runtimeEnv?: Record<string, string | undefined>) {
  const openRouterService = this.createOpenRouterService(runtimeEnv);
  const model = runtimeEnv?.OPENROUTER_MODEL || this.model; // Cloudflare runtime lub build-time
  // ...
}
```

### 6. API Endpoints
Wszystkie endpointy przekazują `locals.runtime?.env`:

```typescript
export const POST: APIRoute = async ({ locals, request, params }) => {
  const service = new TravelPlanService();
  const result = await service.generatePlan(
    noteContent, 
    options, 
    locals.runtime?.env // ✅ Przekazuje runtime env z Cloudflare
  );
  // ...
};
```

### 7. `astro.config.mjs`
Wszystkie wymagane zmienne mają domyślne wartości (brak `optional: true`):

```javascript
env: {
  schema: {
    // Required - Astro wymaga tych zmiennych przy starcie
    SUPABASE_URL: envField.string({
      context: "server",
      access: "public",
    }),
    SUPABASE_ANON_KEY: envField.string({
      context: "server",
      access: "public",
    }),
    SUPABASE_SERVICE_ROLE_KEY: envField.string({
      context: "server",
      access: "secret",
    }),
    OPENROUTER_API_KEY: envField.string({
      context: "server",
      access: "secret",
    }),
    // Optional - ma wartość domyślną w kodzie
    OPENROUTER_MODEL: envField.string({
      context: "server",
      access: "public", // Public - to tylko nazwa modelu, nie secret
      optional: true,
    }),
  },
}
```

## Konfiguracja Środowisk

### Local Development (.env)

```env
# Supabase (Required)
SUPABASE_URL="your-supabase-project-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# OpenRouter.ai
OPENROUTER_API_KEY="your-openrouter-api-key"          # Required (Secret)
OPENROUTER_MODEL="anthropic/claude-3.5-haiku"         # Optional (Public - model name)
```

### GitHub Actions

#### Secrets (Settings → Secrets and variables → Actions → Secrets):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_USERNAME_ID` (tylko dla testów)

#### Variables (Settings → Secrets and variables → Actions → Variables):
- `OPENROUTER_MODEL` = `anthropic/claude-3.5-haiku`

#### Workflows:
```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  OPENROUTER_MODEL: ${{ vars.OPENROUTER_MODEL }}  # ✅ Variable, nie Secret
```

### Cloudflare Pages Dashboard

Idź do: **Cloudflare Dashboard → Pages → Twój Projekt → Settings → Environment variables**

Dla środowiska **Production** dodaj:

#### Secrets (Encrypt):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`

#### Plain Text (No encryption):
- `OPENROUTER_MODEL` = `anthropic/claude-3.5-haiku` (opcjonalne)

⚠️ **Wielkość liter ma znaczenie!** Nazwy muszą być dokładnie takie jak wyżej.

⚠️ **Po dodaniu/zmianie zmiennych**: Kliknij "Redeploy" w Cloudflare Dashboard aby runtime environment został odświeżony!

## Jak To Działa - Flow Diagramy

### Local Development
```
Application Code
    ↓
import { SUPABASE_URL } from "astro:env/server"
    ↓
Value from .env file
    ↓
const url = (context.runtime?.env.SUPABASE_URL || SUPABASE_URL) as string
    ↓
context.runtime is undefined → uses SUPABASE_URL
```

### Cloudflare Production
```
HTTP Request
    ↓
Middleware (locals.runtime populated by Cloudflare)
    ↓
context.runtime.env (zmienne z Cloudflare Dashboard)
    ↓
createSupabaseServerInstance({ runtime: context.runtime })
    ↓
const url = (context.runtime?.env.SUPABASE_URL || SUPABASE_URL) as string
    ↓
Uses context.runtime.env.SUPABASE_URL (from Dashboard)
```

## Dlaczego Wcześniej Nie Działało?

1. **Build przechodzi** ✅ - zmienne są w GitHub Secrets, dostępne podczas `npm run build`
2. **Kod się kompiluje** ✅ - używa `import.meta.env` który jest zastępowany podczas buildu
3. **Runtime crashuje** ❌ - w Cloudflare runtime, `import.meta.env.SUPABASE_URL` może być `undefined`

**Rozwiązanie**: Cloudflare **przekazuje** zmienne z dashboardu przez `context.runtime.env` → musimy ich tam szukać jako fallback.

## Testowanie w Production

Po deploymencie przetestuj:

1. ✅ **Zaloguj się** - test Supabase Auth
2. ✅ **Stwórz nową notatkę** - test zapisu do Supabase
3. ✅ **Otwórz istniejącą notatkę** - test GET endpoint
4. ✅ **Wygeneruj plan podróży** - test OpenRouter API

Jeśli krok 3 działa ale krok 4 nie:
- Sprawdź `OPENROUTER_API_KEY` w Cloudflare Dashboard
- Sprawdź logi w Cloudflare Dashboard → Pages → Deployments → View logs

## Podsumowanie Rozwiązania

✅ **Prosty fallback pattern** zamiast skomplikowanych funkcji pomocniczych

✅ **Kompatybilność uniwersalna**:
- **Local Development**: `.env` → `import.meta.env`
- **Cloudflare Production**: Dashboard → `context.runtime.env`
- **GitHub Actions**: Secrets/Variables → build-time env vars

✅ **Type-safe**: TypeScript assertions informują o gwarantowanych wartościach

✅ **Semantycznie poprawne**: Secrets dla wrażliwych danych, Variables/Plain Text dla konfiguracji

✅ **Zgodne z best practices**: Minimal code, maximum clarity

## Najczęstsze Problemy

### Problem: 500 error na wszystkich endpointach
**Rozwiązanie**: Sprawdź czy zmienne są w Cloudflare Dashboard i czy kliknąłeś "Redeploy"

### Problem: Build fails w GitHub Actions
**Rozwiązanie**: Sprawdź czy wszystkie wymagane Secrets są dodane w GitHub

### Problem: Działa lokalnie, nie działa w production
**Rozwiązanie**: Sprawdź czy zmienne w Cloudflare Dashboard mają dokładnie takie same nazwy jak w kodzie (case-sensitive)

### Problem: OPENROUTER_MODEL nie działa
**Rozwiązanie**: To opcjonalna zmienna - aplikacja używa domyślnej wartości `anthropic/claude-3.5-haiku` jeśli nie jest ustawiona


