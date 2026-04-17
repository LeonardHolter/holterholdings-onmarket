"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type CellValueChangedEvent,
  type ICellRendererParams,
  type ValueFormatterParams,
} from "ag-grid-community";
import { supabase } from "@/lib/supabase";
import type { Broker, Deal, DealStatus, DealWithBroker } from "@/lib/types";
import QuickAddModal from "./QuickAddModal";

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_LABELS: Record<DealStatus, string> = {
  awaiting_cim: "Awaiting CIM",
  cim_received: "CIM Received",
  loi_sent: "LOI Sent",
};

const NEXT_STATUS: Record<DealStatus, DealStatus | null> = {
  awaiting_cim: "cim_received",
  cim_received: "loi_sent",
  loi_sent: null,
};

function formatCurrency(params: ValueFormatterParams) {
  if (params.value == null || params.value === "") return "";
  const n = Number(params.value);
  if (isNaN(n)) return String(params.value);
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatMultiple(params: ValueFormatterParams) {
  if (params.value == null || params.value === "") return "";
  const n = Number(params.value);
  if (isNaN(n)) return String(params.value);
  return n.toFixed(2) + "x";
}

function daysBetween(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function AgeRenderer(params: ICellRendererParams<DealWithBroker>) {
  const days = daysBetween(params.data?.created_at ?? null);
  if (days == null) return null;

  let bg = "#f1f5f9";
  let color = "#475569";
  if (days >= 45) {
    bg = "#fee2e2";
    color = "#b91c1c";
  } else if (days >= 21) {
    bg = "#ffedd5";
    color = "#c2410c";
  } else if (days >= 7) {
    bg = "#fef9c3";
    color = "#a16207";
  } else {
    bg = "#dcfce7";
    color = "#15803d";
  }

  return (
    <span
      className="age-pill"
      style={{ backgroundColor: bg, color }}
      title={`Added ${new Date(params.data!.created_at).toLocaleDateString()}`}
    >
      {days === 0 ? "today" : `${days}d`}
    </span>
  );
}

interface PromoteButtonProps extends ICellRendererParams<DealWithBroker> {
  context: { onPromote?: (id: string) => void; onDelete?: (id: string) => void };
}

function PromoteButton(props: PromoteButtonProps) {
  const status = props.data?.status as DealStatus;
  const next = NEXT_STATUS[status];
  return (
    <div className="flex items-center gap-1">
      {next && (
        <button
          onClick={() => props.context.onPromote?.(props.data!.id)}
          className="text-xs px-2 py-1 bg-zinc-100 hover:bg-zinc-200 rounded text-zinc-700 transition-colors whitespace-nowrap"
          title={`Move to ${STATUS_LABELS[next]}`}
        >
          → {STATUS_LABELS[next]}
        </button>
      )}
      <button
        onClick={() => props.context.onDelete?.(props.data!.id)}
        className="text-zinc-400 hover:text-red-500 transition-colors px-1"
        title="Delete deal"
      >
        ✕
      </button>
    </div>
  );
}

interface DealGridProps {
  status: DealStatus;
  title: string;
  subtitle: string;
  extraColumns?: ColDef<DealWithBroker>[];
  hideBaseFields?: Array<keyof DealWithBroker>;
  hideNotes?: boolean;
  enableQuickPaste?: boolean;
}

export default function DealGrid({
  status,
  title,
  subtitle,
  extraColumns = [],
  hideBaseFields = [],
  hideNotes = false,
  enableQuickPaste = false,
}: DealGridProps) {
  const gridRef = useRef<AgGridReact<DealWithBroker>>(null);
  const [rowData, setRowData] = useState<DealWithBroker[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const handleQuickAdded = useCallback(async (deal: Deal) => {
    const { data, error } = await supabase
      .from("deals")
      .select("*, brokers(name, email, phone)")
      .eq("id", deal.id)
      .single();
    if (error) {
      console.error(error);
      return;
    }
    const brokerData = data.brokers as
      | { name: string; email: string; phone: string }
      | null;
    const enriched: DealWithBroker = {
      ...(data as Deal),
      broker_name: brokerData?.name ?? null,
      broker_email: brokerData?.email ?? null,
      broker_phone: brokerData?.phone ?? null,
    };
    setRowData((prev) => [enriched, ...prev]);

    const { data: freshBrokers } = await supabase
      .from("brokers")
      .select("*")
      .order("name");
    if (freshBrokers) setBrokers(freshBrokers);
  }, []);

  const fetchData = useCallback(async () => {
    const [dealsRes, brokersRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, brokers(name, email, phone)")
        .eq("status", status)
        .order("created_at", { ascending: false }),
      supabase.from("brokers").select("*").order("name"),
    ]);

    if (dealsRes.error) {
      console.error("Error fetching deals:", dealsRes.error);
    }
    if (brokersRes.error) {
      console.error("Error fetching brokers:", brokersRes.error);
    }

    const deals: DealWithBroker[] = (dealsRes.data ?? []).map((d: Record<string, unknown>) => {
      const brokerData = d.brokers as { name: string; email: string; phone: string } | null;
      return {
        ...d,
        broker_name: brokerData?.name ?? null,
        broker_email: brokerData?.email ?? null,
        broker_phone: brokerData?.phone ?? null,
      } as DealWithBroker;
    });

    setRowData(deals);
    setBrokers(brokersRes.data ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const handleCellValueChanged = useCallback(
    async (event: CellValueChangedEvent<DealWithBroker>) => {
      const row = { ...event.data! };
      const field = event.colDef.field;

      // --- Broker fields (stored on the broker row, not the deal) ---------
      if (field === "broker_name") {
        const trimmed = String(event.newValue ?? "").trim();

        if (!trimmed) {
          row.broker_id = null;
          row.broker_name = null;
          row.broker_email = null;
          row.broker_phone = null;
          event.node.setData(row);
        } else {
          // Look up an existing broker case-insensitively; create if missing.
          const existing = brokers.find(
            (b) => b.name.toLowerCase() === trimmed.toLowerCase()
          );
          let brokerId = existing?.id ?? null;
          if (!existing) {
            const { data: created, error: createErr } = await supabase
              .from("brokers")
              .insert({ name: trimmed })
              .select()
              .single();
            if (createErr) {
              console.error("Error creating broker:", createErr);
            } else {
              brokerId = created.id;
              setBrokers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            }
          }
          row.broker_id = brokerId;
          row.broker_name = existing?.name ?? trimmed;
          row.broker_email = existing?.email ?? null;
          row.broker_phone = existing?.phone ?? null;
          event.node.setData(row);
        }
      }

      if (field === "broker_phone" || field === "broker_email") {
        const value = String(event.newValue ?? "").trim() || null;
        if (!row.broker_id) {
          // No broker linked – create one using the current broker_name (or a placeholder).
          const nameForNewBroker = (row.broker_name ?? "").trim() || "Unnamed Broker";
          const { data: created, error: createErr } = await supabase
            .from("brokers")
            .insert({
              name: nameForNewBroker,
              [field === "broker_phone" ? "phone" : "email"]: value,
            })
            .select()
            .single();
          if (createErr) {
            console.error("Error creating broker:", createErr);
          } else {
            row.broker_id = created.id;
            row.broker_name = created.name;
            row.broker_phone = created.phone;
            row.broker_email = created.email;
            event.node.setData(row);
            setBrokers((prev) => [...prev, created]);
          }
        } else {
          const dbField = field === "broker_phone" ? "phone" : "email";
          const { error: brokerErr } = await supabase
            .from("brokers")
            .update({ [dbField]: value })
            .eq("id", row.broker_id);
          if (brokerErr) {
            console.error("Error updating broker:", brokerErr);
          } else {
            setBrokers((prev) =>
              prev.map((b) =>
                b.id === row.broker_id ? { ...b, [dbField]: value } : b
              )
            );
          }
        }
      }

      // --- Deal fields ----------------------------------------------------
      if (row.asking_price && row.ebitda_sde) {
        row.multiple =
          Math.round((row.asking_price / row.ebitda_sde) * 100) / 100;
        event.node.setData(row);
      }

      const {
        broker_name,
        broker_email,
        broker_phone,
        brokers: _b,
        ...dbRow
      } = row as DealWithBroker & { brokers?: unknown };
      void broker_name;
      void broker_email;
      void broker_phone;
      void _b;

      const { error } = await supabase
        .from("deals")
        .update(dbRow)
        .eq("id", row.id);
      if (error) console.error("Error updating deal:", error);
    },
    [brokers]
  );

  const handleAddRow = useCallback(async () => {
    const { data, error } = await supabase
      .from("deals")
      .insert({ business_name: "", status })
      .select()
      .single();
    if (error) {
      console.error("Error adding deal:", error);
      return;
    }
    setRowData((prev) => [{ ...data, broker_name: null, broker_email: null, broker_phone: null }, ...prev]);
  }, [status]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      console.error("Error deleting deal:", error);
      return;
    }
    setRowData((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handlePromote = useCallback(
    async (id: string) => {
      const next = NEXT_STATUS[status];
      if (!next) return;

      const updates: Record<string, unknown> = { status: next };
      if (next === "cim_received") {
        updates.cim_received_date = new Date().toISOString().slice(0, 10);
      } else if (next === "loi_sent") {
        updates.loi_sent_date = new Date().toISOString().slice(0, 10);
      }

      const { error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id);
      if (error) {
        console.error("Error promoting deal:", error);
        return;
      }
      setRowData((prev) => prev.filter((d) => d.id !== id));
    },
    [status]
  );

  const brokerNames = useMemo(
    () => brokers.map((b) => b.name),
    [brokers]
  );

  const baseColumns = useMemo<ColDef<DealWithBroker>[]>(
    () => [
      {
        field: "business_name",
        headerName: "Business Name",
        editable: true,
        flex: 1.5,
        minWidth: 180,
        pinned: "left",
      },
      {
        field: "industry",
        headerName: "Industry",
        editable: true,
        flex: 1,
        minWidth: 120,
      },
      {
        field: "location",
        headerName: "Location",
        editable: true,
        flex: 1,
        minWidth: 120,
      },
      {
        field: "asking_price",
        headerName: "Asking Price",
        editable: true,
        flex: 1,
        minWidth: 130,
        valueFormatter: formatCurrency,
        cellDataType: "number",
      },
      {
        field: "ebitda_sde",
        headerName: "EBITDA / SDE",
        editable: true,
        flex: 1,
        minWidth: 130,
        valueFormatter: formatCurrency,
        cellDataType: "number",
      },
      {
        field: "ebitda_sde_type",
        headerName: "Type",
        editable: true,
        width: 90,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: ["SDE", "EBITDA"] },
      },
      {
        field: "multiple",
        headerName: "Multiple",
        editable: false,
        width: 100,
        valueFormatter: formatMultiple,
      },
      {
        field: "broker_name",
        headerName: "Broker",
        editable: true,
        flex: 1,
        minWidth: 140,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: brokerNames },
      },
    ],
    [brokerNames]
  );

  const endColumns = useMemo<ColDef<DealWithBroker>[]>(
    () => [
      {
        field: "notes",
        headerName: "Notes",
        editable: true,
        flex: 1.5,
        minWidth: 180,
      },
      {
        headerName: "Age",
        width: 90,
        field: "created_at",
        cellRenderer: AgeRenderer,
        sortable: true,
        filter: "agNumberColumnFilter",
        valueGetter: (params) =>
          daysBetween(params.data?.created_at ?? null) ?? -1,
        resizable: false,
      },
      {
        headerName: "Actions",
        width: 170,
        cellRenderer: PromoteButton,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ],
    []
  );

  const columnDefs = useMemo<ColDef<DealWithBroker>[]>(() => {
    const filteredBase = baseColumns.filter(
      (c) => !c.field || !hideBaseFields.includes(c.field as keyof DealWithBroker)
    );
    const filteredEnd = hideNotes
      ? endColumns.filter((c) => c.field !== "notes")
      : endColumns;
    return [...filteredBase, ...extraColumns, ...filteredEnd];
  }, [baseColumns, extraColumns, endColumns, hideBaseFields, hideNotes]);

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
          <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {enableQuickPaste && (
            <button
              onClick={() => setQuickAddOpen(true)}
              className="px-4 py-2 bg-white border border-zinc-300 text-zinc-800 text-sm font-medium rounded-md hover:bg-zinc-50 transition-colors"
            >
              Quick Paste
            </button>
          )}
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-700 transition-colors"
          >
            + Add Deal
          </button>
        </div>
      </div>

      <QuickAddModal
        status={status}
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdded={handleQuickAdded}
      />

      <div className="flex-1 px-6 py-4">
        <div className="h-full ag-theme-alpine">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-zinc-400">
              Loading...
            </div>
          ) : (
            <AgGridReact<DealWithBroker>
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellValueChanged={handleCellValueChanged}
              context={{ onPromote: handlePromote, onDelete: handleDelete }}
              animateRows
              domLayout="autoHeight"
            />
          )}
        </div>
      </div>
    </div>
  );
}
