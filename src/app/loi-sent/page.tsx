"use client";

import { useMemo } from "react";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import DealGrid from "@/components/DealGrid";
import type { DealWithBroker } from "@/lib/types";

function formatCurrency(params: ValueFormatterParams) {
  if (params.value == null || params.value === "") return "";
  const n = Number(params.value);
  if (isNaN(n)) return String(params.value);
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function LoiSentPage() {
  const extraColumns = useMemo<ColDef<DealWithBroker>[]>(
    () => [
      {
        field: "loi_amount",
        headerName: "LOI Amount",
        editable: true,
        flex: 1,
        minWidth: 130,
        valueFormatter: formatCurrency,
        cellDataType: "number",
      },
      {
        field: "loi_sent_date",
        headerName: "LOI Sent Date",
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
      status="loi_sent"
      title="LOI Sent"
      subtitle="Deals where a Letter of Intent has been submitted"
      extraColumns={extraColumns}
    />
  );
}
