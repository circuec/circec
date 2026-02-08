import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9ąćęłńóśźż]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80) + '-' + Date.now();

    const { data, error } = await supabase
      .from('news')
      .insert({
        title: body.title,
        slug: slug,
        excerpt: body.excerpt,
        content: body.content,
        category_slug: body.category,
        tags: body.tags?.split(',').map((t: string) => t.trim()) || [],
        source_type: 'manual',
        source_name: 'CIRCEC',
        status: body.publishNow ? 'published' : 'draft',
        published_at: body.publishNow ? new Date().toISOString() : null,
        image_url: body.imageUrl || null
      })
      .select(); // Dodaj .select() żeby zwróciło dane

    if (error) throw error;

    // Poprawiona linia - bez odwołania do id
    return NextResponse.json({ success: true, data });
    
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}