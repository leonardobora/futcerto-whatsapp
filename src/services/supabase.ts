// =============================================================================
// supabase.ts - Cliente Supabase configurado
// FutCerto v2.0
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config";

// Tipagem do schema do banco de dados
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone_number: string;
          name: string;
          role: "jogador" | "gestor";
          created_at: string;
          updated_at: string;
          last_interaction: string;
          preferences: Record<string, unknown>;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at" | "last_interaction"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      courts: {
        Row: {
          id: number;
          manager_id: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          max_players: number;
          hourly_rate: number;
          operating_hours: Record<string, string[]>;
          amenities: string[];
          images: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["courts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["courts"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: number;
          booking_code: string;
          court_id: number;
          user_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          total_price: number;
          status: "pending" | "confirmed" | "cancelled" | "completed";
          rejection_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      conversation_history: {
        Row: {
          id: number;
          user_id: string;
          message: string;
          sender: "user" | "bot";
          agent_type: "router" | "jogador" | "gestor" | null;
          intent: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["conversation_history"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["conversation_history"]["Insert"]>;
      };
      time_blocks: {
        Row: {
          id: number;
          court_id: number;
          block_date: string;
          start_time: string;
          end_time: string;
          reason: string;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["time_blocks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["time_blocks"]["Insert"]>;
      };
    };
  };
}

// Cliente com chave anônima (para operações do usuário)
let _anonClient: SupabaseClient<Database> | null = null;

// Cliente com chave de serviço (para operações administrativas do backend)
let _serviceClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_anonClient) {
    const config = getConfig();
    _anonClient = createClient<Database>(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return _anonClient;
}

export function getSupabaseServiceClient(): SupabaseClient<Database> {
  if (!_serviceClient) {
    const config = getConfig();
    _serviceClient = createClient<Database>(
      config.supabase.url,
      config.supabase.serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return _serviceClient;
}

// Alias conveniente (usa service client para o backend)
export const supabase = {
  get client() {
    return getSupabaseServiceClient();
  }
};

export default supabase;
