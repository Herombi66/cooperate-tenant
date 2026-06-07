
// Tenant Settings Types
export interface InterestRateConfig {
  cash: number;
  venture: number;
  emergency: number;
  educational: number;
  investment: number;
}

export interface RepaymentMonthsConfig {
  cash: number;
  venture: number;
  emergency: number;
  educational: number;
  investment: number;
}

export interface ContributionRulesConfig {
  minAmount: number;
  feePercentage: number;
  registrationFee: number;
  monthlyAdminFee: number;
}

export interface ContributionAllocationConfig {
  savings: number;
  investment: number;
  targetSaving: number;
}

export interface WithdrawalPolicyConfig {
  minAmount: number;
  maxPercentage: number;
  processingDays: number;
}

export interface ProfitSharingRatioConfig {
  members: number;
  cooperative: number;
}

export interface ApprovalFlowsConfig {
  loan: string[];
  withdrawal: string[];
  expense: string[];
}

export interface NotificationsConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

export interface TenantSettings {
  maxLoanAmount: number;
  interestRate: InterestRateConfig;
  maxRepaymentMonths: RepaymentMonthsConfig;
  minRepaymentMonths: RepaymentMonthsConfig;
  contributionRules: ContributionRulesConfig;
  contributionAllocation: ContributionAllocationConfig;
  withdrawalPolicy: WithdrawalPolicyConfig;
  profitSharingMethod: 'equal' | 'contribution-based' | 'hybrid';
  profitSharingRatio: ProfitSharingRatioConfig;
  approvalFlows: ApprovalFlowsConfig;
  notifications: NotificationsConfig;
}

export interface SettingsState {
  settings: TenantSettings | null;
  isLoading: boolean;
  error: string | null;
}
