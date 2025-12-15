# Dokument wymagań produktu (PRD) - PhotoSpot

## 1. Przegląd produktu
PhotoSpot to aplikacja webowa, która pomaga fotografom oraz miłośnikom fotografii szybko odnaleźć malownicze lokalizacje do zdjęć oraz dzielić się własnymi kadrami. Produkt łączy interaktywną mapę z galerią zdjęć, zapewniając fotografom ekspozycję a użytkownikom inspirację oraz praktyczne informacje o miejscach.

## 2. Problem użytkownika
1. Trudność w znajdowaniu atrakcyjnych lokacji fotograficznych, szczególnie w obcym mieście.
2. Rozproszone i niespójne źródła informacji (blogi, grupy Facebook, fora) utrudniają szybkie porównanie miejsc.
3. Fotografowie szukają sposobu na promocję swoich usług i portfolio poza social-mediami.

## 3. Wymagania funkcjonalne
1. System kont i uwierzytelniania (e-mail / hasło) z wyborem roli użytkownika (fotograf / szukający inspiracji).
2. Interaktywna mapa (Mapbox) z pinezkami reprezentującymi zdjęcia (złote – fotograf, niebieskie – pozostali), z clusteringiem powyżej 50 punktów i lazy-loadingiem 200 pinezek w viewport.
3. Horyzontalny pasek miniatur zdjęć widocznych w aktualnym widoku mapy, zsynchronizowany z pinezkami (kliknięcie pinezki przewija pasek; kliknięcie miniatury centruje mapę).
4. System filtrów: kategoria, pora dnia, sezon, „tylko fotografowie”.
5. Dodawanie zdjęcia: upload JPG/PNG ≤ 10 MB, automatyczna detekcja lokalizacji z EXIF lub manualne wskazanie, tytuł, kategoria (wymagane) + opcjonalnie opis, predefiniowane tagi, informacje o sprzęcie.
6. Opcja rozmycia dokładnej lokalizacji (100–500 m) oraz limit 5 zdjęć/dzień dla nowych kont.
7. Profile użytkowników: avatar, nazwa wyświetlana, galeria „Więcej od…”; dla fotografów dodatkowo nazwa firmy, link www, social media, e-mail.
8. System ulubionych: prywatna lista, toggle „serduszko”.
9. Unikalne adresy URL dla zdjęć (`/photo/[id]`) oraz profili (`/user/[id]`).
10. Moderacja treści: blokada zdjęć bez geolokalizacji, system zgłoszeń, ręczna weryfikacja w MVP.
11. Onboarding 3-krokowy: wybór roli → ustawienie lokalizacji → interaktywny tutorial.
12. Wyszukiwanie nazw lokalizacji (geokodowanie).
13. Edycja i usuwanie własnych zdjęć.
14. Zaplecze administracyjne (tylko minimalne API logs + Sentry dla błędów).

## 4. Granice produktu
– Brak płatności, subskrypcji i monetyzacji w MVP.
– Brak komunikatora, follow, komentarzy, kolekcji ulubionych, bulk-uploadu i trybu offline.
– Manualne testowanie bez pełnej automatyzacji.
– Minimalne compliance prawne: zgoda na cookies + checkbox RODO; pełna polityka prywatności przed publicznym launchem (poza zakresem MVP).

## 5. Historyjki użytkowników
| ID | Tytuł | Opis | Kryteria akceptacji |
|----|-------|------|---------------------|
| US-001 | Rejestracja konta | Jako nowy użytkownik chcę zarejestrować się e-mailem i hasłem oraz wybrać rolę, aby uzyskać dostęp do aplikacji. | 1. Formularz wymaga poprawnego e-maila i min. 8-znakowego hasła. 2. Użytkownik wybiera rolę Fotograf / Entuzjasta. 3. Po rejestracji użytkownik jest zalogowany i przekierowany do onboardingu. |
| US-002 | Logowanie | Jako zarejestrowany użytkownik chcę się zalogować, aby zarządzać swoim kontem. | 1. Nieprawidłowe dane wyświetlają komunikat o błędzie. 2. Poprawne dane przekierowują na mapę. |
| US-003 | Reset hasła | Jako zapominalski użytkownik chcę zresetować hasło, aby odzyskać dostęp. | 1. Użytkownik otrzymuje e-mail z linkiem resetu. 2. Po zmianie hasła może się zalogować nowym hasłem. |
| US-004 | Przegląd mapy | Jako użytkownik chcę zobaczyć mapę z pinezkami zdjęć, aby znaleźć ciekawe miejsca. | 1. Pinezki ładują się zgodnie z aktualnym viewportem (≤200). 2. Clustering aktywuje się przy >50 punktach w obszarze. |
| US-005 | Zastosowanie filtrów | Jako użytkownik chcę filtrować zdjęcia po kategorii, porze dnia, sezonie i roli autora, aby zawęzić wyniki. | 1. Wybrane filtry aktualizują pinezki i pasek. 2. Brak wyników wyświetla informację „Brak zdjęć”. |
| US-006 | Synchronizacja mapy i paska | Jako użytkownik chcę, aby kliknięcie pinezki przewijało pasek do zdjęcia i odwrotnie, aby łatwo przełączać się między widokami. | 1. Kliknięcie pinezki otwiera popup z podglądem i przewija pasek. 2. Kliknięcie miniatury centruje mapę na pinezce. |
| US-007 | Podgląd zdjęcia | Jako użytkownik chcę zobaczyć podgląd zdjęcia i skrócone dane lokacji w popupie, aby ocenić miejsce. | 1. Popup pokazuje miniaturę, tytuł, autora. 2. Link „Więcej” prowadzi do pełnej strony zdjęcia. |
| US-008 | Upload zdjęcia | Jako fotograf chcę przesłać nowe zdjęcie z lokalizacją i danymi, aby podzielić się miejscem z innymi. | 1. Wymagane pola: plik, tytuł, kategoria, lokalizacja. 2. Walidacja rozmiaru i formatu. 3. Po zapisie zdjęcie pojawia się na mapie. |
| US-009 | Rozmycie lokalizacji | Jako fotograf chcę rozmyć dokładną lokalizację wrażliwego miejsca, aby chronić je przed nadużyciem. | 1. Suwak 100–500 m przesuwa pinezkę losowo w zakresie. 2. Informacja „Lokalizacja przybliżona” w popupie. |
| US-010 | Edycja zdjęcia | Jako autor chcę edytować szczegóły mojego zdjęcia, aby poprawić błędy. | 1. Autor widzi przycisk „Edytuj” na swojej stronie zdjęcia. 2. Zmiany zapisują się i odświeżają podgląd. |
| US-011 | Usunięcie zdjęcia | Jako autor chcę usunąć moje zdjęcie, jeśli jest nieaktualne. | 1. Potwierdzenie usunięcia. 2. Pinezka znika z mapy. |
| US-012 | Dodanie do ulubionych | Jako użytkownik chcę dodać zdjęcie do prywatnej listy ulubionych, aby łatwo je odszukać później. | 1. Kliknięcie serduszka dodaje/usuwa zdjęcie z listy. 2. Lista dostępna w profilu użytkownika. |
| US-013 | Przegląd profilu | Jako użytkownik chcę zobaczyć profil autora z większą galerią zdjęć, aby poznać więcej jego prac. | 1. Sekcja „Więcej od…” w popupie pokazuje 3–5 miniatur. 2. Pełny profil zawiera wszystkie zdjęcia autora. |
| US-014 | Raportowanie zdjęcia | Jako użytkownik chcę zgłosić zdjęcie nieodpowiednie lub błędne, aby utrzymać jakość treści. | 1. Formularz wyboru powodu (spam, privacy, wrong location). 2. Admin widzi zgłoszenie w panelu. |
| US-015 | Wyszukiwanie lokalizacji | Jako użytkownik chcę wyszukać miejsce po nazwie, aby szybko przeskoczyć do interesującej lokalizacji. | 1. Autouzupełnianie adresów. 2. Wynik centruje mapę na danym punkcie. |
| US-016 | Onboarding | Jako nowy użytkownik chcę przejść krótki onboarding, aby zrozumieć podstawy korzystania z aplikacji. | 1. 3 ekrany z możliwością pominięcia. 2. Po ukończeniu użytkownik trafia na mapę. |
| US-017 | Bezpieczny dostęp (autoryzacja) | Jako użytkownik zalogowany chcę, aby moje sesje były chronione i wygasały po 7 dniach nieaktywności, aby zapewnić bezpieczeństwo danych. | 1. Token sesji wygasa po 7 dniach. 2. Dostęp do uploadu i edycji wymaga zalogowania. |

## 6. Metryki sukcesu
1. 100 zarejestrowanych użytkowników w pierwszym miesiącu od uruchomienia (M1).
2. ≥300 przesłanych zdjęć w ciągu 60 dni.
3. Średnio ≥3 kliknięcia pinezek na sesję.
4. ≥30% aktywnych użytkowników (MAU/Total) w M2.
5. Maksymalny czas ładowania mapy < 2 s w 90-tym percentylu.
6. ≤1% błędów uploadu (status 4xx/5xx) miesięcznie.
7. ≥5 zgłoszonych błędów (NPS feedback) rozwiązanych w <14 dni.
