"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type CellValueChangedEvent,
  type ICellRendererParams,
} from "ag-grid-community";
import { supabase } from "@/lib/supabase";
import type { Broker } from "@/lib/types";

ModuleRegistry.registerModules([AllCommunityModule]);

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

function DeleteButton(props: ICellRendererParams<Broker>) {
  const handleClick = () => {
    if (props.context?.onDelete) {
      props.context.onDelete(props.data!.id);
    }
  };
  return (
    <button
      onClick={handleClick}
      className="text-zinc-400 hover:text-red-500 transition-colors px-2"
      title="Delete broker"
    >
      ✕
    </button>
  );
}

export default function BrokerGrid() {
  const gridRef = useRef<AgGridReact<Broker>>(null);
  const [rowData, setRowData] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBrokers = useCallback(async () => {
    const { data, error } = await supabase
      .from("brokers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching brokers:", error);
      return;
    }
    setRowData(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBrokers();
  }, [fetchBrokers]);

  const handleCellValueChanged = useCallback(
    async (event: CellValueChangedEvent<Broker>) => {
      const { id, created_at: _created_at, ...rest } = event.data!;
      void _created_at;
      const { error } = await supabase
        .from("brokers")
        .update(rest)
        .eq("id", id);
      if (error) console.error("Error updating broker:", error);
    },
    []
  );

  const handleAddRow = useCallback(async () => {
    const { data, error } = await supabase
      .from("brokers")
      .insert({ name: "" })
      .select()
      .single();
    if (error) {
      console.error("Error adding broker:", error);
      return;
    }
    setRowData((prev) => [data, ...prev]);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("brokers").delete().eq("id", id);
    if (error) {
      console.error("Error deleting broker:", error);
      return;
    }
    setRowData((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const columnDefs = useMemo<ColDef<Broker>[]>(
    () => [
      {
        field: "name",
        headerName: "Name",
        editable: true,
        flex: 1.5,
        minWidth: 160,
      },
      {
        field: "company",
        headerName: "Company",
        editable: true,
        flex: 1.2,
        minWidth: 140,
      },
      {
        field: "email",
        headerName: "Email",
        editable: true,
        flex: 1.5,
        minWidth: 180,
      },
      {
        field: "phone",
        headerName: "Phone",
        editable: true,
        flex: 1,
        minWidth: 130,
      },
      {
        field: "last_contacted",
        headerName: "Last Contacted",
        editable: true,
        flex: 1,
        minWidth: 130,
        cellEditor: "agDateStringCellEditor",
      },
      {
        headerName: "Days Since Contact",
        flex: 0.8,
        minWidth: 130,
        valueGetter: (params) =>
          daysSince(params.data?.last_contacted ?? null),
        cellRenderer: (params: ICellRendererParams<Broker>) => {
          const days = params.value as number | null;
          if (days == null) return <span className="text-zinc-400">—</span>;
          let bg = "#dcfce7";
          let color = "#15803d";
          if (days >= 14) {
            bg = "#fee2e2";
            color = "#b91c1c";
          } else if (days >= 10) {
            bg = "#ffedd5";
            color = "#c2410c";
          } else if (days >= 7) {
            bg = "#fef9c3";
            color = "#a16207";
          }
          return (
            <span
              className="age-pill"
              style={{ backgroundColor: bg, color }}
            >
              {days === 0 ? "today" : `${days}d`}
            </span>
          );
        },
      },
      {
        field: "notes",
        headerName: "Notes",
        editable: true,
        flex: 2,
        minWidth: 200,
      },
      {
        headerName: "",
        width: 50,
        cellRenderer: DeleteButton,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">
            Broker Tracker
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Track broker contacts and outreach cadence
          </p>
        </div>
        <button
          onClick={handleAddRow}
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-700 transition-colors"
        >
          + Add Broker
        </button>
      </div>

      <div className="flex-1 px-6 py-4">
        <div className="h-full ag-theme-alpine">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-zinc-400">
              Loading...
            </div>
          ) : (
            <AgGridReact<Broker>
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellValueChanged={handleCellValueChanged}
              context={{ onDelete: handleDelete }}
              animateRows
              rowSelection="multiple"
              domLayout="autoHeight"
              getRowClass={(params) => {
                const days = daysSince(params.data?.last_contacted ?? null);
                if (days === null || days >= 14) return "row-needs-contact";
                return "";
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
