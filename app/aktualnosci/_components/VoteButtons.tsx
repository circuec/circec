"use client";

import { useState } from "react";

interface VoteButtonsProps {
  newsId: number;
  initialScore: number;
}

export default function VoteButtons({ newsId, initialScore }: VoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVote(vote: 1 | -1) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/news/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: newsId, vote }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
        setUserVote(data.userVote);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        title="Przydatne"
        className={`flex items-center justify-center w-7 h-7 rounded-full text-sm transition-colors ${
          userVote === 1
            ? "bg-emerald-500 text-white"
            : "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700"
        }`}
      >
        ▲
      </button>
      <span
        className={`text-xs font-semibold w-6 text-center tabular-nums ${
          score > 0
            ? "text-emerald-600"
            : score < 0
            ? "text-red-500"
            : "text-slate-400"
        }`}
      >
        {score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        title="Nieprzydatne"
        className={`flex items-center justify-center w-7 h-7 rounded-full text-sm transition-colors ${
          userVote === -1
            ? "bg-red-500 text-white"
            : "bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600"
        }`}
      >
        ▼
      </button>
    </div>
  );
}
