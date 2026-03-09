"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Start" },
  { href: "/gospodarka-obiegu", label: "GOZ" },
  { href: "/rynek-metali", label: "Rynek Metali" },
  { href: "/aktualnosci", label: "Aktualności" },
  { href: "/kongres", label: "Kongres" },
  { href: "/o-nas", label: "O nas" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu"
        className="flex flex-col gap-1.5 p-2 text-white"
      >
        <span className={`block w-6 h-0.5 bg-white transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`block w-6 h-0.5 bg-white transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`block w-6 h-0.5 bg-white transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-emerald-900 shadow-xl z-50 border-t border-emerald-700">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-6 py-3 text-white hover:bg-emerald-700 transition border-b border-emerald-800 text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
