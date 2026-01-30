import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "CIRCEC - Portal GOZ i surowców wtórnych",
  description: "Portal o Gospodarce Obiegu Zamkniętego oraz rynku metali i surowców wtórnych",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        {/* NAGŁÓWEK */}
        <header className="bg-emerald-800 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold tracking-tight">
              CIRCEC<span className="text-emerald-300">.eu</span>
            </Link>
            
            <nav className="hidden md:flex gap-6">
              <Link href="/" className="hover:text-emerald-300 transition">Start</Link>
              <Link href="/gospodarka-obiegu" className="hover:text-emerald-300 transition">GOZ</Link>
              <Link href="/rynek-metali" className="hover:text-emerald-300 transition">Rynek Metali</Link>
              <Link href="/o-nas" className="hover:text-emerald-300 transition">O nas</Link>
            </nav>

            {/* Menu mobilne (hamburger) - uproszczone */}
            <div className="md:hidden text-sm">
              Menu ↓
            </div>
          </div>
        </header>

        {/* GŁÓWNA ZAWARTOŚĆ */}
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>

        {/* STOPKA */}
        <footer className="bg-slate-800 text-slate-300 py-8 mt-auto">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="mb-2">© 2024 CIRCEC - Centrum Informacji GOZ</p>
            <p className="text-sm text-slate-400">
              Portal dedykowany gospodarce obiegu zamkniętego i rynkowi surowców wtórnych
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}