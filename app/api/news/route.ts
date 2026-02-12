// Ten endpoint istnieje tylko po to, aby /api/news było poprawną trasą
// i żeby generator typów Next (validator) nie próbował importować nieistniejącego pliku.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true });
}