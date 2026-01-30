'use client';

import { useEffect, useState } from 'react';

interface MetalPrice {
  symbol: string;
  name: string;
  unit: string;
  unitName: string;
  prices: {
    PLN?: { price: number; change: number; currency: string };
    USD?: { price: number; change: number; currency: string };
    EUR?: { price: number; change: number; currency: string };
  };
  rates?: {
    PLNtoUSD: number;
    PLNtoEUR: number | null;
  };
  timestamp: string;
}

export default function RynekMetali() {
  const [data, setData] = useState<MetalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    async function fetchPrices() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/metals');
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Błąd pobierania danych');
        }
        
        // Pokazujemy TYLKO metale które mają pełne dane (przynajmniej PLN)
        const validData = result.data.filter((m: MetalPrice) => m.prices.PLN);
        
        setData(validData);
        setMeta(result.meta);
        
        if (validData.length === 0) {
          setError('Brak dostępnych danych rynkowych. Sprawdź poprawność klucza API lub dostępność usługi GoldAPI.');
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nieznany błąd');
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Rynek Metali</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
          <span className="ml-3 text-slate-600">Łączenie z giełdą...</span>
        </div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Rynek Metali</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Błąd pobierania danych</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rynek Metali i Surowców</h1>
          <p className="text-slate-500 mt-2">
            Ceny bieżące z giełd światowych • <span className="font-medium">{data.length}</span> instrumentów dostępnych
          </p>
        </div>
        {meta?.updatedAt && (
          <div className="text-sm text-slate-400 bg-white px-4 py-2 rounded-lg shadow-sm border">
            Aktualizacja: {new Date(meta.updatedAt).toLocaleString('pl-PL')}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
          ⚠️ {error} (wyświetlane ostatnie dostępne dane)
        </div>
      )}

      {/* KURSY WALUT */}
      {data[0]?.rates && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Kurs USD/PLN</div>
            <div className="text-lg font-semibold text-slate-800">
              {data[0].rates.PLNtoUSD ? (1 / data[0].rates.PLNtoUSD).toFixed(4) : '—'}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Kurs EUR/PLN</div>
            <div className="text-lg font-semibold text-slate-800">
              {data[0].rates.PLNtoEUR ? (1 / data[0].rates.PLNtoEUR).toFixed(4) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* KARTY METALI */}
      <div className="grid md:grid-cols-2 gap-6">
        {data.map((metal) => (
          <div 
            key={metal.symbol} 
            className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{metal.name}</h2>
                <div className="text-xs text-slate-500 mt-1">
                  Symbol: {metal.symbol} • {metal.unitName}
                </div>
              </div>
              <span className="text-3xl">
                {metal.symbol === 'XAU' && '🥇'}
                {metal.symbol === 'XAG' && '🥈'}
                {metal.symbol === 'XCU' && '🔶'}
                {metal.symbol === 'ALU' && '🔩'}
              </span>
            </div>
            
            {/* CENA GŁÓWNA PLN */}
            {metal.prices.PLN && (
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {metal.prices.PLN.price.toLocaleString('pl-PL', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} PLN
                  </span>
                  <span className="text-sm text-slate-500">/{metal.unit}</span>
                </div>
                <div className={`text-sm font-medium flex items-center gap-1 mt-1 ${
                  metal.prices.PLN.change > 0 ? 'text-emerald-600' : 
                  metal.prices.PLN.change < 0 ? 'text-red-600' : 'text-slate-500'
                }`}>
                  {metal.prices.PLN.change > 0 && '▲'}
                  {metal.prices.PLN.change < 0 && '▼'}
                  <span>{metal.prices.PLN.change > 0 ? '+' : ''}{metal.prices.PLN.change}% (24h)</span>
                </div>
              </div>
            )}

            {/* POZOSTAŁE WALUTY */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-sm">
              {metal.prices.USD && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">USD</div>
                  <div className="font-semibold text-slate-700">
                    ${metal.prices.USD.price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className={`text-xs ${
                    metal.prices.USD.change > 0 ? 'text-emerald-600' : 
                    metal.prices.USD.change < 0 ? 'text-red-600' : 'text-slate-500'
                  }`}>
                    {metal.prices.USD.change > 0 ? '+' : ''}{metal.prices.USD.change}%
                  </div>
                </div>
              )}
              
              {metal.prices.EUR && (
                <div>
                  <div className="text-slate-500 text-xs mb-1">EUR</div>
                  <div className="font-semibold text-slate-700">
                    €{metal.prices.EUR.price.toLocaleString('de-DE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className={`text-xs ${
                    metal.prices.EUR.change > 0 ? 'text-emerald-600' : 
                    metal.prices.EUR.change < 0 ? 'text-red-600' : 'text-slate-500'
                  }`}>
                    {metal.prices.EUR.change > 0 ? '+' : ''}{metal.prices.EUR.change}%
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-slate-400">
              {new Date(metal.timestamp).toLocaleString('pl-PL')}
            </div>
          </div>
        ))}
      </div>

      {/* INFORMACJA O ŹRÓDLE */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-600 text-sm flex justify-between items-center">
        <div>
          <strong>Źródło:</strong> GoldAPI.io • Dane rzeczywiste (brak danych = błąd lub limit API)
          <br />
          <span className="text-xs text-slate-500">
            * Złoto i srebro notowane za uncję trojańską (oz t = 31,10g)
          </span>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm"
        >
          🔄 Odśwież
        </button>
      </div>
    </div>
  );
}