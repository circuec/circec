import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Wymuszamy Node.js runtime (bez Edge) – bezpieczniej dla zewnętrznych API + Supabase
export const runtime = 'nodejs';

/**
 * Klient Supabase po stronie serwera.
 * Używamy SERVICE ROLE, bo zapisujemy do bazy (INSERT),
 * a RLS jest włączone i blokuje anon key.
 */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Darmowy plan GoldAPI: tylko XAU i XAG działają
const CONFIG = [
  {
    code: 'XAU',
    name: 'Złoto',
    unit: 'oz t',
    unitName: 'uncja trojańska (31,10g)',
    decimals: 2,
  },
  {
    code: 'XAG',
    name: 'Srebro',
    unit: 'oz t',
    unitName: 'uncja trojańska (31,10g)',
    decimals: 2,
  },
];

export async function GET() {
  // 1) Walidujemy, czy mamy klucz GoldAPI
  if (!process.env.GOLD_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Brak GOLD_API_KEY w env', data: [] },
      { status: 500 }
    );
  }

  // 2) Walidujemy, czy mamy klucze Supabase (żeby nie było cichych błędów)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { success: false, error: 'Brak SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w env', data: [] },
      { status: 500 }
    );
  }

  try {
    // 3) Jakie waluty pobieramy z GoldAPI
    const currencies = ['PLN', 'USD', 'EUR'] as const;

    // 4) Tu zbieramy odpowiedź dla frontu
    const results: any[] = [];

    // 5) Iterujemy po metalach z CONFIG
    for (const metal of CONFIG) {
      // Obiekt zwrotny do UI (frontend dalej może pokazywać PLN/USD/EUR)
      const priceData: any = {
        symbol: metal.code, // XAU / XAG
        name: metal.name,
        unit: metal.unit,
        unitName: metal.unitName,
        prices: {},
        timestamp: new Date().toISOString(),
      };

      let hasAnyPrice = false;

      // 6) Pobieramy ceny dla każdej waluty
      for (const curr of currencies) {
        try {
          const response = await fetch(`https://www.goldapi.io/api/${metal.code}/${curr}`, {
            headers: {
              'x-access-token': process.env.GOLD_API_KEY,
              'Content-Type': 'application/json',
            },
            // Cache w Next – GoldAPI nie musi być odpytywane co sekundę
            next: { revalidate: 300 },
          });

          if (!response.ok) {
            console.log(`${metal.code}/${curr}: Błąd ${response.status}`);
            continue;
          }

          const data = await response.json();

          // Zapisujemy do obiektu dla UI
          priceData.prices[curr] = {
            price: Number(Number(data.price).toFixed(2)),
            change: Number((data.chp || 0).toFixed(2)),
            currency: curr,
          };

          hasAnyPrice = true;
        } catch (err) {
          console.error(`Błąd ${metal.code}/${curr}:`, err);
        }
      }

      // 7) Jeśli mamy dane, liczymy kursy pomocnicze i zapisujemy do bazy
      if (hasAnyPrice && priceData.prices.USD) {
        // Kursy “pomocnicze” (tylko do UI)
        if (priceData.prices.PLN && priceData.prices.USD) {
          priceData.rates = {
            PLNtoUSD: Number((priceData.prices.USD.price / priceData.prices.PLN.price).toFixed(4)),
            PLNtoEUR: priceData.prices.EUR
              ? Number((priceData.prices.EUR.price / priceData.prices.PLN.price).toFixed(4))
              : null,
          };
        }

        // 8) Zapis do Supabase – zapisujemy jedną “główną” cenę w USD
        // (Jeśli chcesz trzymać wszystkie waluty w bazie, zrobimy osobną tabelę/model)
        const usdPrice = priceData.prices.USD.price;

        const { error: dbError } = await supabase.from('metal_prices').insert({
          symbol: metal.code,     // XAU / XAG
          name: metal.name,       // Złoto / Srebro
          price: usdPrice,        // liczba
          currency: 'USD',        // zapisujemy jako USD
          source: 'goldapi',      // źródło danych
          // unit: metal.unit,     // ✅ odkomentuj jeśli masz kolumnę unit w metal_prices
        });

        if (dbError) {
          console.error(`Błąd zapisu do bazy ${metal.name}:`, dbError);
          priceData.saved = false;
          priceData.dbError = dbError.message;
        } else {
          priceData.saved = true;
        }

        results.push(priceData);
      } else {
        // Jeśli nie udało się pobrać USD, pomijamy zapis do DB (bo nie mamy "głównej" ceny)
        results.push({
          ...priceData,
          saved: false,
          dbError: 'Brak ceny USD – pominięto zapis do bazy',
        });
      }
    }

    // 9) Odpowiedź końcowa
    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        updatedAt: new Date().toISOString(),
        source: 'GoldAPI.io',
      },
    });
  } catch (error) {
    console.error('Krytyczny błąd:', error);
    return NextResponse.json(
      { success: false, error: 'Błąd serwera', data: [] },
      { status: 500 }
    );
  }
}
