// Hand-maintained DB types for Fusion Studio.
// Kept in sync with supabase/migrations. (Can be regenerated later with
// `supabase gen types typescript` once Docker/CI is available.)

export type CreatedVia = "admin" | "coupon_transfer";
export type CardStatus = "active" | "expired" | "revoked";
export type CouponStatus = "available" | "revealed" | "redeemed" | "expired";
export type MembershipTheme = "silver" | "gold" | "platinum" | "black";

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
}

export interface Member {
  id: string;
  mobile: string;
  name: string | null;
  is_loyalty: boolean;
  mobile_verified_at: string | null;
  pin_hash: string | null;
  pin_reset_required: boolean;
  created_via: CreatedVia;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
}

export interface MembershipType {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  validity_days: number;
  theme: MembershipTheme;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Benefit {
  id: string;
  membership_type_id: string;
  text: string;
  sort_order: number;
  created_at: string;
}

export interface MembershipCard {
  id: string;
  membership_number: string;
  membership_type_id: string;
  member_id: string;
  valid_from: string;
  valid_until: string;
  status: CardStatus;
  issued_at: string;
}

export type CouponKind = "marketing" | "membership";

export interface CouponDefinition {
  id: string;
  name: string;
  description: string;
  terms: string | null;
  kind: CouponKind;
  valid_from: string;
  /** Fixed expiry for marketing coupons; null for membership coupons. */
  valid_until: string | null;
  usage_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssignedCoupon {
  id: string;
  coupon_number: string;
  coupon_definition_id: string;
  member_id: string;
  status: CouponStatus;
  redemption_code: string | null;
  revealed_at: string | null;
  redeemed_at: string | null;
  redeemed_by_admin_id: string | null;
  uses_count: number;
  source: "admin" | "default" | "transfer";
  unassigned_at: string | null;
  unassigned_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipTypeDefaultCoupon {
  id: string;
  membership_type_id: string;
  coupon_definition_id: string;
  created_at: string;
}

export interface CouponTransfer {
  id: string;
  assigned_coupon_id: string;
  from_member_id: string | null;
  to_member_id: string;
  to_mobile: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  member_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: unknown;
  created_at: string;
}

// Minimal shape the supabase-js generic expects. We keep the row types above
// as the source of truth and map the tables here.
type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };

export interface Database {
  public: {
    Tables: {
      admins: Row<Admin>;
      members: Row<Member>;
      membership_types: Row<MembershipType>;
      benefits: Row<Benefit>;
      membership_cards: Row<MembershipCard>;
      coupon_definitions: Row<CouponDefinition>;
      assigned_coupons: Row<AssignedCoupon>;
      coupon_transfers: Row<CouponTransfer>;
      audit_log: Row<AuditLog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      created_via: CreatedVia;
      card_status: CardStatus;
      coupon_status: CouponStatus;
      membership_theme: MembershipTheme;
    };
  };
}
