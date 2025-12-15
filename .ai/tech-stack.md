1. Front-End
- Astro 5 – statyczne generowanie + wyspy React; minimalny JS, szybkie TTFB, prosty deploy na Vercel.
- React 19 – bogaty ekosystem komponentów i hooks; potrzebny tam, gdzie wymagana pełna interaktywność (mapa, upload).
- TypeScript 5 – bezpieczeństwo typów, lepsze DX i refaktoryzacja w rosnącym projekcie.
- Tailwind CSS 4 – szybkie prototypowanie UI bez nadmiaru klas utility w produkcji (JIT).
- shadcn/ui – gotowe, dostępne komponenty React oparte na Tailwind; wyrównuje wygląd i skraca czas kodowania.
2. Back-End / Baza danych / Usługi
- Supabase (Postgres + Auth + Storage + Edge Functions) – „backend-as-a-service” eliminujący konieczność pisania własnego serwera; RLS dla bezpieczeństwa danych, prosty limit 5 zdjęć/dzień, łatwy upload plików ≤ 10 MB.
- Mapbox GL JS / Tiles – wysokiej jakości kafelki, clustering i geokodowanie w jednym ekosystemie; ryzyko kosztowe monitorowane już od MVP.
3. Hosting / DevOps
- Vercel – zero-config deploy dla Astro/React, globalny CDN, Edge Functions; wygodne preview z każdej gałęzi, wbudowane zmienne środowiskowe i monitoring.
- GitHub Actions (+Sentry) – ciągła integracja, automatyczne testy/linting i instant preview; Sentry dla śledzenia błędów front+edge.