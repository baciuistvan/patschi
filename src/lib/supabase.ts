import { createClient } from '@supabase/supabase-js';

function getSupabaseCredentials() {
  let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (window as any).VITE_SUPABASE_URL;
  let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any).VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseUrl = localStorage.getItem('supabase_url') || '';
    supabaseAnonKey = localStorage.getItem('supabase_anon_key') || '';
  }

  return { supabaseUrl, supabaseAnonKey };
}

export const isConfigured = () => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
  return !!(supabaseUrl && supabaseAnonKey);
};

let supabaseClient: any = null;

export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    if (!supabaseClient) {
      const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
      if (supabaseUrl && supabaseAnonKey) {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      }
    }
    return supabaseClient?.[prop];
  }
});

export type Room = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Table = {
  id: string;
  room_id: string;
  table_number: string;
  capacity: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'circle' | 'square' | 'halfcircle';
  rotation: number;
  is_active: boolean;
  is_bookable: boolean;
  custom_label?: string;
  created_at: string;
  updated_at: string;
};

export type Reservation = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests: string;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_amount: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  created_at: string;
};

export type GiftCard = {
  id: string;
  code: string;
  original_amount: number;
  current_balance: number;
  recipient_name: string;
  recipient_email: string;
  purchaser_name: string;
  purchaser_email: string;
  message: string;
  template_id: string | null;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  purchase_date: string;
  expiry_date: string;
  pdf_url: string | null;
  barcode: string | null;
  payment_status: 'pending' | 'completed' | 'failed';
  email_sent: boolean;
  payment_link: string | null;
  created_at: string;
  updated_at: string;
};
