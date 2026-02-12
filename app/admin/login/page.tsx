'use client';

// To jest strona logowania dla panelu admina.
// Logujemy się przez Supabase Auth (email + hasło).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Klient Supabase w przeglądarce (anon key + URL)
// Supabase i tak rozpozna użytkownika po sesji po zalogowaniu.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLoginPage() {
  const router = useRouter();

  // Stan formularza
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Stan UI
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Supabase Auth: logowanie email+hasło
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Po udanym logowaniu przenosimy do panelu
    router.push('/admin/aktualnosci');
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Logowanie admina</h1>
      <p className="text-slate-600 mb-8">
        Zaloguj się kontem z Supabase Auth, żeby wejść do panelu redakcyjnego.
      </p>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <b>Błąd:</b> {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">Email</label>
          <input
            type="email"
            required
            className="w-full border rounded-lg px-4 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700">Hasło</label>
          <input
            type="password"
            required
            className="w-full border rounded-lg px-4 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-60"
        >
          {loading ? 'Logowanie…' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
}
