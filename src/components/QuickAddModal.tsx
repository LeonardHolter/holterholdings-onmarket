"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseBizBuySell, type ParsedListing } from "@/lib/parseBizBuySell";
import type { Deal, DealStatus } from "@/lib/types";

interface QuickAddModalProps {
  status: DealStatus;
  open: boolean;
  onClose: () => void;
  onAdded: (deal: Deal) => void;
}

export default function QuickAddModal({
  status,
  open,
  onClose,
  onAdded,
}: QuickAddModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedListing | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleParse = () => {
    setError(null);
    if (!rawText.trim()) {
      setError("Paste a listing first.");
      return;
    }
    const result = parseBizBuySell(rawText);
    if (!result.business_name) {
      setError(
        "Could not detect a business name. Paste the full listing or fill fields manually below."
      );
    }
    setParsed(result);
  };

  const handleReset = () => {
    setRawText("");
    setParsed(null);
    setError(null);
  };

  const updateField = <K extends keyof ParsedListing>(
    key: K,
    value: ParsedListing[K]
  ) => {
    setParsed((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!parsed) return;
    if (!parsed.business_name.trim()) {
      setError("Business name is required.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      // Find or create the broker if a name was extracted.
      let broker_id: string | null = null;
      if (parsed.broker_name.trim()) {
        const { data: existing, error: findErr } = await supabase
          .from("brokers")
          .select("id")
          .ilike("name", parsed.broker_name.trim())
          .maybeSingle();
        if (findErr) throw findErr;

        if (existing) {
          broker_id = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from("brokers")
            .insert({
              name: parsed.broker_name.trim(),
              company: parsed.broker_company.trim() || null,
              phone: parsed.broker_phone.trim() || null,
            })
            .select()
            .single();
          if (createErr) throw createErr;
          broker_id = created.id;
        }
      }

      const multiple =
        parsed.asking_price && parsed.ebitda_sde
          ? Math.round((parsed.asking_price / parsed.ebitda_sde) * 100) / 100
          : null;

      const { data: deal, error: dealErr } = await supabase
        .from("deals")
        .insert({
          business_name: parsed.business_name.trim(),
          location: parsed.location.trim() || null,
          asking_price: parsed.asking_price,
          ebitda_sde: parsed.ebitda_sde,
          ebitda_sde_type: parsed.ebitda_sde_type,
          multiple,
          revenue: parsed.revenue,
          description: parsed.description.trim() || null,
          listing_url: parsed.listing_url.trim() || null,
          broker_id,
          status,
        })
        .select()
        .single();
      if (dealErr) throw dealErr;

      onAdded(deal);
      handleReset();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save deal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Quick Add from Listing
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Paste a BizBuySell listing and we&apos;ll extract the fields for
              you.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!parsed && (
            <>
              <label className="block text-xs font-medium text-zinc-600 uppercase tracking-wide">
                Paste listing text
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full h-80 border border-zinc-300 rounded-md p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="Paste the entire listing page from BizBuySell here..."
              />
            </>
          )}

          {parsed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Review the extracted fields, edit anything that looks wrong,
                  then save.
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs text-zinc-500 hover:text-zinc-800 underline"
                >
                  Start over
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Business Name *"
                  value={parsed.business_name}
                  onChange={(v) => updateField("business_name", v)}
                />
                <Field
                  label="Location"
                  value={parsed.location}
                  onChange={(v) => updateField("location", v)}
                />
                <Field
                  label="Asking Price"
                  value={parsed.asking_price?.toString() ?? ""}
                  onChange={(v) =>
                    updateField("asking_price", v ? Number(v) : null)
                  }
                  type="number"
                />
                <Field
                  label="Revenue"
                  value={parsed.revenue?.toString() ?? ""}
                  onChange={(v) => updateField("revenue", v ? Number(v) : null)}
                  type="number"
                />
                <Field
                  label={`${parsed.ebitda_sde_type}`}
                  value={parsed.ebitda_sde?.toString() ?? ""}
                  onChange={(v) =>
                    updateField("ebitda_sde", v ? Number(v) : null)
                  }
                  type="number"
                />
                <div>
                  <label className="block text-xs font-medium text-zinc-600 uppercase tracking-wide mb-1">
                    Type
                  </label>
                  <select
                    value={parsed.ebitda_sde_type}
                    onChange={(e) =>
                      updateField(
                        "ebitda_sde_type",
                        e.target.value as "SDE" | "EBITDA"
                      )
                    }
                    className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="SDE">SDE</option>
                    <option value="EBITDA">EBITDA</option>
                  </select>
                </div>
                <Field
                  label="Listing URL"
                  value={parsed.listing_url}
                  onChange={(v) => updateField("listing_url", v)}
                />
                <Field
                  label="Ad #"
                  value={parsed.ad_number}
                  onChange={(v) => updateField("ad_number", v)}
                />
                <Field
                  label="Broker Name"
                  value={parsed.broker_name}
                  onChange={(v) => updateField("broker_name", v)}
                />
                <Field
                  label="Broker Company"
                  value={parsed.broker_company}
                  onChange={(v) => updateField("broker_company", v)}
                />
                <Field
                  label="Broker Phone"
                  value={parsed.broker_phone}
                  onChange={(v) => updateField("broker_phone", v)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  value={parsed.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="w-full h-32 border border-zinc-300 rounded-md p-3 text-sm"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-md"
          >
            Cancel
          </button>
          {!parsed ? (
            <button
              onClick={handleParse}
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-700"
            >
              Parse Listing
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add to Pipeline"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
      />
    </div>
  );
}
