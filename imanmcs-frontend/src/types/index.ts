export interface User {
  id: string | number;
  psn: string;
  name: string;
  email: string;
  phone?: string;
<<<<<<< HEAD
  role: 'admin' | 'member' | 'treasurer' | 'chairman' | 'secretary' | 'super_admin';
=======
  role: 'admin' | 'super_admin' | 'member' | 'treasurer' | 'chairman' | 'secretary' | 'manager' | 'operator' | 'viewer' | 'state_auditor';
  can_create_animal_requests?: boolean;
  canCreateAnimalRequests?: boolean;
>>>>>>> c89d2cf068bf46fa699f6d0221ce3e9b0751a166
  isDefaultPassword?: boolean;
  is_default_password?: boolean;
  status: 'active' | 'inactive' | 'suspended';
  profileImage?: string;
  facility_name?: string;
  target_saving?: number;
  target_period?: number;
  membershipApplication?: {
    id: number;
    name: string;
    psn: string;
    email: string;
    phone?: string;
    facility_name?: string;
  };
}

export interface Application {
  id: number;
  name: string;
  psn: string;
  email: string;
  phone: string;
  facility_name: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  savings: number;
  investment: number;
  target_saving: number;
  target_period: number;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  application_date?: string;
  has_passport_photo?: boolean;
  has_id_document?: boolean;
  // Optional nested objects for backward compatibility
  personalInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  professionalInfo?: {
    facilityName: string;
    position: string;
  };
}

export interface Contribution {
  id: number;
  user_id: number;
  period: string;
  savings_amount: number;
  investment_amount: number;
  total_amount: number;
  payment_method: string;
  receipt_number: string;
  status: 'confirmed' | 'pending';
  created_at?: string;
  has_receipt?: boolean;
}

export interface Loan {
  id: number;
  user_id: number;
  loan_type: 'cash' | 'investment';
  amount: number;
  purpose: string;
  guarantor_psn: string;
  guarantor_approval: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  application_date?: string;
  repayment_period: number;
  monthly_repayment: number;
  total_repayment: number;
  balance: number;
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  created_at?: string;
  has_receipt?: boolean;
}

export interface MemberLoanProfile {
  totalInvestment: number;
  totalSavings: number;
  activeLoanBalance: number;
  membershipDuration: number;
  psn: string;
  name: string;
  hasActiveLoan?: boolean;
  existingLoan?: {
    id: string;
    status: string;
    amount_requested: number;
    application_date: string;
  };
}

export interface DashboardStats {
  summary: {
    total_users: number;
    total_applications: number;
    pending_applications: number;
    total_contributions: number;
    total_loans: number;
    active_loans: number;
    total_expenses: number;
  };
  financial: {
    total_savings: number;
    total_investment: number;
    total_funds: number;
    total_loan_amount: number;
    total_expenses: number;
    net_position: number;
  };
  recent_activities: {
    contributions: Array<{
      id: number;
      user_id: number;
      period: string;
      amount: number;
      date: string;
    }>;
    applications: Array<{
      id: number;
      name: string;
      status: string;
      date: string;
    }>;
  };
}

export interface MemberLoanProfile {
  totalInvestment: number;
  totalSavings: number;
  activeLoanBalance: number;
  membershipDuration: number;
  psn: string;
  name: string;
  hasActiveLoan?: boolean;
  existingLoan?: {
    id: string;
    status: string;
    amount_requested: number;
    application_date: string;
  };
}

// Layyah Module Types
export type LayyahKind = 'individual' | 'group';
export type AnimalCategory = 'ram' | 'sheep' | 'goat' | 'cow' | 'buffalo';
export type LayyahStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'submitted' | 'reviewed';
export type GroupMemberStatus = 'pending' | 'accepted' | 'declined';

export interface LayyahApplication {
  id: number;
  applicant_user_id: number;
  applicant_name?: string;
  applicant_psn?: string;
  applicant_email?: string;
  applicant_phone?: string;
  kind: LayyahKind;
  animal_category: AnimalCategory;
  animal_type?: string;
  price_min: number;
  price_max: number;
  applied_amount?: number;
  amount_version?: number;
  price_range?: string;
  status: LayyahStatus;
  purpose?: string;
  start_date?: string;
  end_date?: string;
  reviewed_by?: string;
  approved_by?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  group_member_count?: number;
  group_role?: 'leader' | 'member' | 'moderator';
  group_members?: LayyahGroupMember[];
  group_id?: number;
  group_leader_id?: number;
}

export interface LayyahAdminApplicantRow {
  member_id: number;
  application_id: number;
  name: string;
  psn: string | null;
  email: string | null;
  phone: string | null;
  kind: LayyahKind;
  animal_category: AnimalCategory;
  animal_type?: string;
  quantity: number;
  price_min: number;
  price_max: number;
  applied_amount: number;
  price_range?: string;
  application_date: string;
  status: LayyahStatus;
  amount_version: number;
  notes?: string;
}

export interface LayyahGroupMember {
  id: number;
  application_id: number;
  member_user_id: number;
  member_name: string;
  member_psn: string;
  status: GroupMemberStatus;
  invited_at: string;
  responded_at?: string;
  notes?: string;
}

export interface LayyahApplicationCreate {
  kind: LayyahKind;
  animal_category: AnimalCategory;
  price_min: number;
  price_max: number;
  start_date?: string;
  end_date?: string;
}

export interface LayyahApplicationUpdate {
  kind?: LayyahKind;
  animal_category?: AnimalCategory;
  price_min?: number;
  price_max?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface LayyahGroupInvitation {
  application_id: number;
  member_psn: string;
}

export interface LayyahApplicationApproval {
  status: LayyahStatus;
  rejection_reason?: string;
  notes?: string;
}

export interface LayyahApplicationStats {
  total_applications: number;
  pending_applications: number;
  under_review_applications?: number;
  approved_applications: number;
  rejected_applications: number;
  disbursed_applications?: number;
  group_applications: number;
  individual_applications: number;
  total_commodities?: number;
  active_groups?: number;
  financials?: {
    projected_total: number;
    pending_total: number;
    approved_total: number;
    individual_total: number;
    group_total: number;
  };
}

export interface LayyahGroupInvitationResponse {
  id: number;
  application_id: number;
  applicant_name: string;
  applicant_psn: string;
  animal_category: AnimalCategory;
  price_range: string;
  invited_at: string;
  status: GroupMemberStatus;
}

export type LayyahGroupType = 'public' | 'private' | 'restricted';
export type LayyahGroupUserRole = 'owner' | 'admin' | 'member' | 'guest';

export interface LayyahGroupMembershipInfo {
  id: number;
  status: LayyahStatus | string;
}

export interface LayyahGroupSummary {
  id: number;
  group_name: string;
  description: string;
  animal_category: AnimalCategory;
  price_min: number;
  price_max: number;
  created_at: string;
  group_type: LayyahGroupType;
  member_count: number;
  pending_count: number;
  available_slots: number;
  status: string;
  applicant_name?: string;
  user_psn?: string;
  user_role: LayyahGroupUserRole;
  membership: LayyahGroupMembershipInfo | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type AnimalAcquisitionRequestStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface AnimalCatalogItem {
  value: string;
  label: string;
  icon?: string;
}

export interface AnimalAcquisitionRequest {
  id: number;
  member_user_id: number;
  member: { id: number; psn: string; name: string; email: string } | null;
  created_by: number;
  created_by_user: { id: number; psn: string; name: string; email: string } | null;
  animal_category: string;
  quantity: number;
  delivery_start_date: string | null;
  delivery_end_date: string | null;
  reason_html: string | null;
  reason_text: string | null;
  status: AnimalAcquisitionRequestStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
  rejected_by: number | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}
