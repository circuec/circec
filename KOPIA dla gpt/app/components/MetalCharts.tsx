'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MetalChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data: prices } = await supabase
        .from('metal_prices')
        .select('*')
        .eq('symbol', symbol)
        .order('created_at', { ascending: true })
        .limit(30);
      
      setData(prices || []);
    }
    fetchData();
  }, [symbol]);

  if (data.length === 0) return <div className="text-gray-400 text-sm">Brak danych historycznych</div>;

  return (
    <div className="h-48 bg-white rounded-lg p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="created_at" tickFormatter={(d) => new Date(d).toLocaleDateString('pl-PL', {day:'2-digit', month:'2-digit'})} />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip formatter={(val: any) => typeof val === 'number' ? val.toFixed(2) : val} />
          <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}