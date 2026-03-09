"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SortToggle({ currentSort }: { currentSort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setSort(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "date") {
      params.delete("sort");
    } else {
      params.set("sort", sort);
    }
    router.push(`/aktualnosci?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 text-xs">
      <button
        onClick={() => setSort("date")}
        className={`px-3 py-1.5 rounded-md font-medium transition ${
          currentSort === "date"
            ? "bg-white text-slate-800 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Najnowsze
      </button>
      <button
        onClick={() => setSort("score")}
        className={`px-3 py-1.5 rounded-md font-medium transition ${
          currentSort === "score"
            ? "bg-white text-slate-800 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        ▲ Polecane
      </button>
    </div>
  );
}
