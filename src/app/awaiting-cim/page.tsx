"use client";

import { useMemo } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
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

export default function AwaitingCimPage() {
  const extraColumns = useMemo<ColDef<DealWithBroker>[]>(
    () => [
      {
        field: "listing_url",
        headerName: "Listing",
        editable: true,
        flex: 0.8,
        minWidth: 140,
        cellRenderer: LinkRenderer,
      },
      {
        field: "data_room_link",
        headerName: "Data Room",
        editable: true,
        flex: 0.8,
        minWidth: 140,
        cellRenderer: LinkRenderer,
      },
      {
        field: "broker_phone",
        headerName: "Broker Phone",
        editable: true,
        flex: 0.9,
        minWidth: 130,
      },
      {
        field: "description",
        headerName: "Description",
        editable: true,
        flex: 2,
        minWidth: 220,
      },
    ],
    []
  );

  return (
    <DealGrid
      status="awaiting_cim"
      title="Awaiting CIM"
      subtitle="Businesses waiting on Confidential Information Memorandum"
      extraColumns={extraColumns}
      hideBaseFields={["industry", "location", "ebitda_sde_type", "multiple"]}
      hideNotes
      enableQuickPaste
    />
  );
}
