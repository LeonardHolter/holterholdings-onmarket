export interface Broker {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  last_contacted: string | null;
  notes: string | null;
  created_at: string;
}

export type DealStatus = "awaiting_cim" | "cim_received" | "loi_sent";

export interface Deal {
  id: string;
  business_name: string;
  industry: string | null;
  asking_price: number | null;
  revenue: number | null;
  ebitda_sde: number | null;
  ebitda_sde_type: "SDE" | "EBITDA";
  multiple: number | null;
  description: string | null;
  location: string | null;
  listing_url: string | null;
  data_room_link: string | null;
  cim_received_date: string | null;
  loi_sent_date: string | null;
  loi_amount: number | null;
  status: DealStatus;
  rating: "bad" | "fair" | "great" | null;
  broker_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealWithBroker extends Deal {
  broker_name?: string | null;
  broker_email?: string | null;
  broker_phone?: string | null;
}
