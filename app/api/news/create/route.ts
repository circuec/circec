// Endpoint do tworzenia newsów z panelu admina.
// Zabezpieczenie: wymagamy tokena ADMIN_SECRET w nagłówku Authorization.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Klient Supabase po stronie SERWERA.
// Używamy SERVICE ROLE, bo robimy INSERT do bazy.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // <-- ważne: klucz serwerowy
);

export async function POST(request: NextRequest) {
  // 1) Sprawdzamy, czy wywołujący ma uprawnienia admina (token)
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2) Czytamy dane wysłane z formularza
    const body = await request.json();

    // 3) Tworzymy slug (czyli "ładny adres") na bazie tytułu
    const slug =
      body.title
        .toLowerCase()
        .replace(/[^a-z0-9ąćęłńóśźż]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 80) + '-' + Date.now();

    // 4) Wstawiamy rekord do tabeli news
    const { data, error } = await supabase
      .from('news')
      .insert({
        title: body.title,
        slug,
        excerpt: body.excerpt,
        content: body.content,
        category_slug: body.category,
        tags: body.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
        source_type: 'manual',
        source_name: 'CIRCEC',
        status: body.publishNow ? 'published' : 'draft',
        published_at: body.publishNow ? new Date().toISOString() : null,
        image_url: body.imageUrl || null,
      })
      .select();

    // 5) Jeśli Supabase zgłasza błąd, zwracamy 500
    if (error) throw error;

    // 6) Sukces
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
