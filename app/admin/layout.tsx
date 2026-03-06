//export default function AdminLayout({ children }: { children: React.ReactNode }) {
 // return children; // Dziedziczy style z głównego layout.tsx
//}
//'use client';

// Ten layout działa jak "bramka" dla całej strefy /admin.
// Jeśli użytkownik nie jest zalogowany -> przekierowuje na /admin/login.
"use client";
// Jeśli użytkownik nie jest zalogowany -> przekierowuje na /admin/login.npm run dev

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Żeby nie mrugało: czekamy aż sprawdzimy sesję
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      // Strona logowania ma być dostępna bez sesji
      if (pathname === '/admin/login') {
        if (mounted) setChecking(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace('/admin/login');
        return;
      }

      if (mounted) setChecking(false);
    }

    checkSession();

    // Jeśli sesja się zmieni (np. logout), reagujemy
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (pathname !== '/admin/login' && !session) {
        router.replace('/admin/login');
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Prosty ekran “sprawdzam…”
  if (checking && pathname !== '/admin/login') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-slate-600">
        Sprawdzam sesję…
      </div>
    );
  }

  return <>{children}</>;
}
