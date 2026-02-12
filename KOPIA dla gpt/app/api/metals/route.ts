import { NextResponse } from 'next/server';

// Darmowy plan GoldAPI: tylko XAU i XAG działają
const CONFIG = [
  { 
    code: 'XAU', 
    name: 'Złoto', 
    unit: 'oz t',
    unitName: 'uncja trojańska (31,10g)',
    decimals: 2
  },
  { 
    code: 'XAG', 
    name: 'Srebro', 
    unit: 'oz t',
    unitName: 'uncja trojańska (31,10g)',
    decimals: 2
  }
];

export async function GET() {
  // DEBUG - sprawdzamy czy zmienne są widoczne
 // console.log('=== DEBUG ENV ===');
 // console.log('Klucz istnieje?', !!process.env.GOLD_API_KEY);
 // console.log('Klucz:', process.env.GOLD_API_KEY?.substring(0, 15) + '...');
  //console.log('=================');
  
  if (!process.env.GOLD_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Brak klucza API', data: [] },
      { status: 500 }
    );
  }

  try {
    const currencies = ['PLN', 'USD', 'EUR'];
    const results = [];

    for (const metal of CONFIG) {
      const priceData: any = {
        symbol: metal.code,
        name: metal.name,
        unit: metal.unit,
        unitName: metal.unitName,
        prices: {},
        timestamp: new Date().toISOString()
      };

      let hasAnyPrice = false;

      for (const curr of currencies) {
        try {
          const response = await fetch(
            `https://www.goldapi.io/api/${metal.code}/${curr}`,
            {
              headers: {
                'x-access-token': process.env.GOLD_API_KEY,
                'Content-Type': 'application/json',
              },
              next: { revalidate: 300 }
            }
          );

          if (!response.ok) {
            console.log(`${metal.code}/${curr}: Błąd ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          priceData.prices[curr] = {
            price: Number(data.price.toFixed(2)),
            change: Number((data.chp || 0).toFixed(2)),
            currency: curr
          };
          
          hasAnyPrice = true;

        } catch (err) {
          console.error(`Błąd ${metal.code}/${curr}:`, err);
        }
      }

      if (hasAnyPrice && priceData.prices.PLN) {
        if (priceData.prices.USD && priceData.prices.PLN) {
          priceData.rates = {
            PLNtoUSD: Number((priceData.prices.USD.price / priceData.prices.PLN.price).toFixed(4)),
            PLNtoEUR: priceData.prices.EUR ? Number((priceData.prices.EUR.price / priceData.prices.PLN.price).toFixed(4)) : null
          };
        }
        results.push(priceData);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        updatedAt: new Date().toISOString(),
        source: 'GoldAPI.io'
      }
    });

  } catch (error) {
    console.error('Krytyczny błąd:', error);
    return NextResponse.json(
      { success: false, error: 'Błąd serwera', data: [] },
      { status: 500 }
    );
  }
}