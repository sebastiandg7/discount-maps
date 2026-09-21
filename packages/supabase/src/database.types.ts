/**
 * Hand-authored to match supabase/migrations/20260920000001_init.sql.
 * Regenerate with `pnpm db:types:linked` (or `pnpm db:types` locally) once the project is linked;
 * the generated file replaces this one wholesale.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database['public']['Enums']['user_role'];
          full_name: string | null;
          phone: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id: string;
          role?: Database['public']['Enums']['user_role'];
          full_name?: string | null;
          phone?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          full_name?: string | null;
          phone?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          consumer_id: string;
          status: Database['public']['Enums']['subscription_status'];
          trial_ends_at: Timestamp;
          current_period_end: Timestamp | null;
          wompi_payment_source_id: number | null;
          wompi_customer_email: string;
          card_brand: string | null;
          card_last4: string | null;
          charge_attempts: number;
          next_charge_at: Timestamp | null;
          canceled_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          consumer_id: string;
          status?: Database['public']['Enums']['subscription_status'];
          trial_ends_at: Timestamp;
          current_period_end?: Timestamp | null;
          wompi_payment_source_id?: number | null;
          wompi_customer_email: string;
          card_brand?: string | null;
          card_last4?: string | null;
          charge_attempts?: number;
          next_charge_at?: Timestamp | null;
          canceled_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          consumer_id?: string;
          status?: Database['public']['Enums']['subscription_status'];
          trial_ends_at?: Timestamp;
          current_period_end?: Timestamp | null;
          wompi_payment_source_id?: number | null;
          wompi_customer_email?: string;
          card_brand?: string | null;
          card_last4?: string | null;
          charge_attempts?: number;
          next_charge_at?: Timestamp | null;
          canceled_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          subscription_id: string;
          reference: string;
          wompi_transaction_id: string | null;
          amount_cents: number;
          currency: string;
          status: Database['public']['Enums']['payment_status'];
          attempt: number;
          period_start: Timestamp | null;
          period_end: Timestamp | null;
          raw: Json | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          reference: string;
          wompi_transaction_id?: string | null;
          amount_cents: number;
          currency?: string;
          status?: Database['public']['Enums']['payment_status'];
          attempt?: number;
          period_start?: Timestamp | null;
          period_end?: Timestamp | null;
          raw?: Json | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          reference?: string;
          wompi_transaction_id?: string | null;
          amount_cents?: number;
          currency?: string;
          status?: Database['public']['Enums']['payment_status'];
          attempt?: number;
          period_start?: Timestamp | null;
          period_end?: Timestamp | null;
          raw?: Json | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          legal_name: string;
          display_name: string;
          nit: string;
          category: Database['public']['Enums']['business_category'];
          logo_path: string | null;
          description: string | null;
          verification_status: Database['public']['Enums']['verification_status'];
          verified_at: Timestamp | null;
          verified_by: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          owner_id: string;
          legal_name: string;
          display_name: string;
          nit: string;
          category: Database['public']['Enums']['business_category'];
          logo_path?: string | null;
          description?: string | null;
          verification_status?: Database['public']['Enums']['verification_status'];
          verified_at?: Timestamp | null;
          verified_by?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          owner_id?: string;
          legal_name?: string;
          display_name?: string;
          nit?: string;
          category?: Database['public']['Enums']['business_category'];
          logo_path?: string | null;
          description?: string | null;
          verification_status?: Database['public']['Enums']['verification_status'];
          verified_at?: Timestamp | null;
          verified_by?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          address_line: string;
          city: string;
          location: unknown;
          google_place_id: string | null;
          phone: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          address_line: string;
          city: string;
          location: unknown;
          google_place_id?: string | null;
          phone?: string | null;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          address_line?: string;
          city?: string;
          location?: unknown;
          google_place_id?: string | null;
          phone?: string | null;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          business_id: string;
          title: string;
          description: string | null;
          discount_type: Database['public']['Enums']['discount_type'];
          discount_value: number | null;
          terms: string | null;
          image_path: string | null;
          is_active: boolean;
          valid_from: Timestamp | null;
          valid_until: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          description?: string | null;
          discount_type: Database['public']['Enums']['discount_type'];
          discount_value?: number | null;
          terms?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          valid_from?: Timestamp | null;
          valid_until?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: string;
          business_id?: string;
          title?: string;
          description?: string | null;
          discount_type?: Database['public']['Enums']['discount_type'];
          discount_value?: number | null;
          terms?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          valid_from?: Timestamp | null;
          valid_until?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };
      redemptions: {
        Row: {
          id: string;
          coupon_id: string;
          consumer_id: string;
          branch_id: string | null;
          business_id: string;
          scanned_by: string;
          subscription_status_at_scan: Database['public']['Enums']['subscription_status'];
          token_jti: string;
          scanned_at: Timestamp;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          consumer_id: string;
          branch_id?: string | null;
          business_id: string;
          scanned_by: string;
          subscription_status_at_scan: Database['public']['Enums']['subscription_status'];
          token_jti: string;
          scanned_at?: Timestamp;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          consumer_id?: string;
          branch_id?: string | null;
          business_id?: string;
          scanned_by?: string;
          subscription_status_at_scan?: Database['public']['Enums']['subscription_status'];
          token_jti?: string;
          scanned_at?: Timestamp;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          consumer_id: string;
          endpoint: string;
          keys: Json;
          user_agent: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          consumer_id: string;
          endpoint: string;
          keys: Json;
          user_agent?: string | null;
          created_at?: Timestamp;
        };
        Update: {
          id?: string;
          consumer_id?: string;
          endpoint?: string;
          keys?: Json;
          user_agent?: string | null;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
      business_followers: {
        Row: {
          consumer_id: string;
          business_id: string;
          notify: boolean;
          created_at: Timestamp;
        };
        Insert: {
          consumer_id: string;
          business_id: string;
          notify?: boolean;
          created_at?: Timestamp;
        };
        Update: {
          consumer_id?: string;
          business_id?: string;
          notify?: boolean;
          created_at?: Timestamp;
        };
        Relationships: [];
      };
      wompi_events: {
        Row: {
          checksum: string;
          event_type: string;
          environment: string;
          wompi_transaction_id: string | null;
          payload: Json;
          received_at: Timestamp;
          processed_at: Timestamp | null;
        };
        Insert: {
          checksum: string;
          event_type: string;
          environment: string;
          wompi_transaction_id?: string | null;
          payload: Json;
          received_at?: Timestamp;
          processed_at?: Timestamp | null;
        };
        Update: {
          checksum?: string;
          event_type?: string;
          environment?: string;
          wompi_transaction_id?: string | null;
          payload?: Json;
          received_at?: Timestamp;
          processed_at?: Timestamp | null;
        };
        Relationships: [];
      };
    };
    Views: {
      businesses_public: {
        Row: {
          id: string;
          display_name: string;
          category: Database['public']['Enums']['business_category'];
          logo_path: string | null;
          description: string | null;
          active_coupon_count: number;
          best_score: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      app_role: {
        Args: Record<string, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      issue_coupon_token: { Args: { p_coupon_id: string }; Returns: string };
      verify_coupon_token: {
        Args: { p_token: string; p_branch_id?: string | null };
        Returns: Json;
      };
      nearby_businesses: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_category?: Database['public']['Enums']['business_category'] | null;
          p_radius_m?: number;
          p_sort?: string;
          p_limit?: number;
        };
        Returns: {
          business_id: string;
          branch_id: string;
          display_name: string;
          category: Database['public']['Enums']['business_category'];
          logo_path: string | null;
          branch_name: string;
          address_line: string;
          lat: number;
          lng: number;
          distance_m: number;
          active_coupon_count: number;
          best_score: number;
        }[];
      };
    };
    Enums: {
      user_role: 'consumer' | 'business' | 'admin';
      subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled';
      payment_status: 'pending' | 'approved' | 'declined' | 'voided' | 'error';
      business_category: 'restaurants' | 'beverages' | 'desserts' | 'retail';
      verification_status: 'pending' | 'verified' | 'rejected';
      discount_type: 'percentage' | 'fixed' | 'bogo' | 'other';
    };
    CompositeTypes: Record<string, never>;
  };
};
