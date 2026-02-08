'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MetalPrice {
  symbol: string;
  name: string;
  price: number;        // w USD (z Yahoo)
  change: number;       // zmiana %
  currency: string;     // USD
  unit: string;         // funt, uncja, itp.
  timestamp: string;
}

interface ExchangeRates {
  usdToPln: number;
  eurToPln?: number;
  date: string;
}

export default function RynekMetali() {
  const [metals, setMetals] = useState<MetalPrice[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetal, setSelectedMetal] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Pobierz ceny metali i kursy walut
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Równoległe pobieranie: metale + kursy
        const [metalsRes, ratesRes] = await Promise.all([
          fetch('/api/yahoo'),
          fetch('/api/nbp')
        ]);
        
        if (!metalsRes.ok) throw new Error('Błąd pobierania metali');
        if (!ratesRes.ok) throw new Error('Błąd pobierania kursów');
        
        const metalsData = await metalsRes.json();
        const ratesData = await ratesRes.json();
        
        if (metalsData.success) {
          setMetals(metalsData.data);
        }
        
        setRates(ratesData);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Pobierz historię dla wykresu (gdy klikniesz metal)
  useEffect(() => {
    if (!selectedMetal) return;
    
    async function fetchHistory() {
      const { data } = await supabase
        .from('metal_prices')
        .select('*')
        .eq('symbol', selectedMetal)
        .order('created_at', { ascending: true })
        .limit(30);
      
      setHistory(data || []);
    }
    
    fetchHistory();
  }, [selectedMetal]);

  // Funkcja przeliczania USD → PLN
  const toPLN = (usdPrice: number) => {
    if (!rates?.usdToPln) return null;
    return usdPrice * rates.usdToPln;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Rynek Metali</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Nagłówek z kursami */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Rynek Metali i Surowców</h1>
        
        {rates && (
          <div className="mt-4 flex gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
              <span className="text-sm text-emerald-600 font-medium">USD/PLN</span>
              <div className="text-xl font-bold text-emerald-800">
                {rates.usdToPln.toFixed(4)}
              </div>
              <div className="text-xs text-emerald-500">NBP {rates.date}</div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          ⚠️ {error}
        </div>
      )}

      {/* Karty metali */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {metals.map((metal) => {
          const plnPrice = toPLN(metal.price);
          
          return (
            <div 
              key={metal.symbol}
              onClick={() => setSelectedMetal(metal.symbol)}
              className={`bg-white p-6 rounded-xl shadow-md border-t-4 cursor-pointer transition-all hover:shadow-lg ${
                selectedMetal === metal.symbol ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-emerald-500'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{metal.name}</h2>
                  <div className="text-xs text-slate-500 mt-1">
                    {metal.symbol} • {metal.unit}
                  </div>
                </div>
                <span className="text-3xl">
                  {metal.symbol.includes('GC') && '🥇'}
                  {metal.symbol.includes('SI') && '🥈'}
                  {metal.symbol.includes('HG') && '🔶'}
                  {metal.symbol.includes('ALI') && '🔩'}
                  {metal.symbol.includes('ZN') && '⚙️'}
                </span>
              </div>

              {/* Cena USD */}
              <div className="mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    ${metal.price.toFixed(3)}
                  </span>
                  <span className="text-sm text-slate-500">USD/{metal.unit}</span>
                </div>
                <div className={`text-sm font-medium ${
                  metal.change > 0 ? 'text-emerald-600' : 
                  metal.change < 0 ? 'text-red-600' : 'text-slate-500'
                }`}>
                  {metal.change > 0 ? '▲' : metal.change < 0 ? '▼' : '→'}
                  {metal.change > 0 ? '+' : ''}{metal.change.toFixed(2)}%
                </div>
              </div>

              {/* Cena PLN (przeliczona) */}
              {plnPrice && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="text-sm text-slate-500 mb-1">Przeliczenie:</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-emerald-700">
                      {plnPrice.toFixed(2)} PLN
                    </span>
                    <span className="text-xs text-slate-400">/{metal.unit}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Po kursie NBP z {rates?.date}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sekcja wykresu (gdy wybrany metal) */}
      {selectedMetal && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800">
              Historia: {metals.find(m => m.symbol === selectedMetal)?.name}
            </h3>
            <button 
              onClick={() => setSelectedMetal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕ Zamknij
            </button>
          </div>
          
          {history.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis 
                    dataKey="created_at" 
                    tickFormatter={(d) => new Date(d).toLocaleDateString('pl-PL', {day:'2-digit', month:'2-digit'})}
                  />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip 
                    labelFormatter={(d) => new Date(d).toLocaleDateString('pl-PL')}
                    formatter={(value: any) => typeof value === 'number' ? value.toFixed(3) : value}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12">
              Brak danych historycznych w bazie
            </div>
          )}
        </div>
      )}

      {/* Info o źródłach */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-600 text-sm">
        <strong>Źródła:</strong> Yahoo Finance (futures) • NBP (kursy walut)
        <br />
        <span className="text-xs text-slate-500">
          Ceny futures w USD, przeliczone na PLN po oficjalnym kursie NBP. 
          Kliknij kartę metalu aby zobaczyć wykres historyczny.
        </span>
      </div>
    </div>
  );
}