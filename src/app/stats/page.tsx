"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StatsPage() {
  const [cimsReceived, setCimsReceived] = useState<number | null>(null);
  const [loisSent, setLoisSent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { count: cimCount } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .in("status", ["cim_received", "loi_sent"]);

      const { count: loiCount } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("status", "loi_sent");

      setCimsReceived(cimCount ?? 0);
      setLoisSent(loiCount ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  const conversionRate =
    cimsReceived != null && cimsReceived > 0 && loisSent != null
      ? ((loisSent / cimsReceived) * 100).toFixed(0)
      : null;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Stats</h1>
      <p className="text-sm text-zinc-500 mb-8">Pipeline performance overview</p>

      <div className="grid grid-cols-2 gap-5">
        <KpiCard
          label="CIMs Received"
          value={loading ? "—" : String(cimsReceived ?? 0)}
          sub="total deals with CIM"
        />
        <KpiCard
          label="LOIs Sent / CIMs Received"
          value={loading ? "—" : conversionRate != null ? `${conversionRate}%` : "—"}
          sub={
            loading
              ? ""
              : `${loisSent ?? 0} LOIs out of ${cimsReceived ?? 0} CIMs`
          }
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
        {label}
      </p>
      <p className="text-4xl font-bold text-zinc-900 mb-1">{value}</p>
      <p className="text-xs text-zinc-400">{sub}</p>
    </div>
  );
}
