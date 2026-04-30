"use client";

import { useMemo } from "react";
import type { ColDef, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import DealGrid from "@/components/DealGrid";
import type { DealWithBroker } from "@/lib/types";

function LinkRenderer(params: ICellRendererParams) {
  const url = params.value;
  if (!url) {
    return (
      <span className="text-zinc-400 italic text-xs">double-click to add</span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800"
      title={url}
    >
      Open
    </a>
  );
}

function formatCurrency(params: ValueFormatterParams) {
  if (params.value == null || params.value === "") return "";
  const n = Number(params.value);
  if (isNaN(n)) return String(params.value);
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const RATING_CONFIG = {
  great: { label: "⭐ Great", bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
  fair:  { label: "〰 Fair",  bg: "#fef9c3", color: "#a16207", border: "#fde68a" },
  bad:   { label: "✕ Bad",   bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
};

function RatingRenderer(params: ICellRendererParams<DealWithBroker>) {
  const val = params.value as keyof typeof RATING_CONFIG | null;
  if (!val) {
    return <span className="text-zinc-400 italic text-xs">click to rate</span>;
  }
  const cfg = RATING_CONFIG[val];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.02em",
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function CimReceivedPage() {
  const extraColumns = useMemo<ColDef<DealWithBroker>[]>(
    () => [
      {
        field: "rating",
        headerName: "Rating",
        editable: true,
        width: 140,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["great", "fair", "bad"] },
        cellRenderer: RatingRenderer,
        pinned: "right" as const,
      },
      {
        field: "revenue",
        headerName: "Revenue",
        editable: true,
        flex: 1,
        minWidth: 120,
        valueFormatter: formatCurrency,
        cellDataType: "number",
      },
      {
        field: "data_room_link",
        headerName: "Data Room",
        editable: true,
        flex: 0.8,
        minWidth: 110,
        cellRenderer: LinkRenderer,
      },
      {
        field: "cim_received_date",
        headerName: "CIM Received",
        editable: true,
        flex: 0.9,
        minWidth: 120,
        cellEditor: "agDateStringCellEditor",
      },
      {
        field: "description",
        headerName: "Description",
        editable: true,
        flex: 1.5,
        minWidth: 200,
      },
    ],
    []
  );

  return (
    <DealGrid
      status="cim_received"
      title="CIM Received"
      subtitle="Deals where the Confidential Information Memorandum has been received"
      extraColumns={extraColumns}
      hideBaseFields={["location"]}
    />
  );
}
