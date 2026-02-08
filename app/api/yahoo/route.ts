import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Klient Supabase po stronie serwera
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Symbole metali w Yahoo Finance
const METALS = [
  { symbol: 'HG=F', name: 'Miedź', yahooSymbol: 'HG%3DF' },
  { symbol: 'ALI=F', name: 'Aluminium', yahooSymbol: 'ALI%3DF' }, // NOWE
  { symbol: 'ZN=F', name: 'Cynk', yahooSymbol: 'ZN%3DF' },       // NOWE
  { symbol: 'GC=F', name: 'Złoto', yahooSymbol: 'GC%3DF' },      // alternatywa dla GoldAPI
  { symbol: 'SI=F', name: 'Srebro', yahooSymbol: 'SI%3DF' },     // alternatywa dla GoldAPI
];

export async function GET() {
  try {
    const results = [];

    for (const metal of METALS) {
      try {
        // Endpoint Yahoo Finance - dane dzienne
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${metal.yahooSymbol}?interval=1d&range=1d`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          console.log(`${metal.name}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (!data.chart?.result?.[0]) {
          console.log(`${metal.name}: Brak danych w odpowiedzi`);
          continue;
        }

        const result = data.chart.result[0];
        const meta = result.meta;
        const lastPrice = meta.regularMarketPrice;
        const prevClose = meta.previousClose;
        const change = prevClose ? ((lastPrice - prevClose) / prevClose) * 100 : 0;
        const currency = meta.currency; // zazwyczaj USD

        // Zapis do bazy Supabase
        const { data: inserted, error: dbError } = await supabase
          .from('metal_prices')
          .insert({
            symbol: metal.symbol,
            name: metal.name,
            price: lastPrice,
            currency: currency,
            source: 'yahoo_finance',
          })
          .select();

        if (dbError) {
          console.error(`Błąd zapisu do bazy ${metal.name}:`, dbError);
        } else {
          console.log(`✓ ${metal.name}: $${lastPrice} zapisano do bazy`);
        }

        results.push({
          symbol: metal.symbol,
          name: metal.name,
          price: lastPrice,
          currency: currency,
          change: Number(change.toFixed(2)),
          unit: metal.unit,
          saved: !dbError
        });

      } catch (err) {
        console.error(`Błąd pobierania ${metal.name}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}