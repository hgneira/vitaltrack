"use client";
import { useEffect, useState } from "react";

export default function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="hidden md:flex flex-col items-end leading-tight">
      <span className="text-sm font-bold text-slate-800 tabular-nums">{time}</span>
      <span className="text-xs text-slate-400 capitalize">{date}</span>
    </div>
  );
}
