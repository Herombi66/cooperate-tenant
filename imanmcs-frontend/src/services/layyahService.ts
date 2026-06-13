import api from './api';
import { API_URL } from '../config';
import {
  LayyahApplication,
  LayyahApplicationCreate,
  LayyahApplicationUpdate,
  LayyahGroupInvitation,
  LayyahApplicationApproval,
  LayyahApplicationStats,
  LayyahGroupMember,
  LayyahGroupInvitationResponse,
  LayyahGroupSummary,
  PaginationMeta,
  AnimalCategory,
  LayyahGroupType,
  LayyahGroupUserRole,
  LayyahAdminApplicantRow
} from '../types';

export class LayyahService {
  private static baseUrl = '/layyah';
  private static maxGroupMembers = 5;
  private static duplicateWindowHours = Number((import.meta as any).env?.VITE_LAYYAH_DUPLICATE_WINDOW_HOURS || 168);

  private static isRetryableNotFound(error: any): boolean {
    const status = error?.response?.status;
    return status === 404 || status === 405;
  }

  private static isRetryableDiscoveryError(error: any): boolean {
    const status = error?.response?.status;
    return status === 400 || status === 403 || status === 404 || status === 405;
  }

  static normalizeGroupUserRole(value: any): LayyahGroupUserRole {
    const raw = (value ?? '').toString().trim().toLowerCase();
    if (raw === 'owner') return 'owner';
    if (raw === 'admin' || raw === 'administrator') return 'admin';
    if (raw === 'member') return 'member';
    return 'guest';
  }

  static normalizeGroupType(value: any): LayyahGroupType {
    const raw = (value ?? '').toString().trim().toLowerCase();
    if (raw === 'public') return 'public';
    if (raw === 'private') return 'private';
    return 'restricted';
  }

  static canManageGroupMembers(group: Pick<LayyahGroupSummary, 'user_role'> | null | undefined): boolean {
    const role = this.normalizeGroupUserRole(group?.user_role);
    return role === 'owner' || role === 'admin';
  }

  static canInviteGroupMembers(group: Pick<LayyahGroupSummary, 'user_role' | 'available_slots'> | null | undefined): boolean {
    if (!this.canManageGroupMembers(group)) return false;
    const slots = Number(group?.available_slots ?? 0);
    return Number.isFinite(slots) ? slots > 0 : true;
  }

  static canRequestJoin(group: Pick<LayyahGroupSummary, 'user_role' | 'membership' | 'available_slots' | 'group_type'> | null | undefined): boolean {
    const role = this.normalizeGroupUserRole(group?.user_role);
    if (role !== 'guest') return false;
    if (group?.membership) return false;
    const slots = Number(group?.available_slots ?? 0);
    if (Number.isFinite(slots) && slots <= 0) return false;
    const type = this.normalizeGroupType((group as any)?.group_type);
    if (type === 'restricted') return false;
    return true;
  }

  private static normalizeApplication(app: any): LayyahApplication {
    const applicantName =
      app?.applicant_name ??
      app?.applicantName ??
      app?.user?.membershipApplication?.name ??
      app?.user?.name ??
      app?.name;

    const applicantPsn =
      app?.applicant_psn ??
      app?.applicantPsn ??
      app?.user_psn ??
      app?.userPsn ??
      app?.user?.membershipApplication?.psn ??
      app?.user?.psn ??
      app?.psn;

    const applicantEmail =
      app?.applicant_email ??
      app?.applicantEmail ??
      app?.user?.membershipApplication?.email ??
      app?.email ??
      null;

    const applicantPhone =
      app?.applicant_phone ??
      app?.applicantPhone ??
      app?.user?.membershipApplication?.phone ??
      app?.phone ??
      null;

    const kind = app?.kind ?? app?.type;
    const applied_amount =
      app?.applied_amount != null ? Number(app.applied_amount) : app?.price_max != null ? Number(app.price_max) : undefined;
    const amount_version = app?.amount_version != null ? Number(app.amount_version) : undefined;

    return {
      ...app,
      applicant_name: applicantName,
      applicant_psn: applicantPsn,
      applicant_email: applicantEmail,
      applicant_phone: applicantPhone,
      kind,
      applied_amount,
      amount_version
    };
  }

  private static normalizeGroupSummary(group: any): LayyahGroupSummary {
    const id = Number(group?.id ?? group?.group_id ?? group?.groupId ?? 0);

    const rawMemberCount =
      group?.member_count ??
      group?.members_count ??
      group?.group_member_count ??
      group?.groupMemberCount;
    const parsedMemberCount = Number(rawMemberCount ?? 0);
    const memberCountFromGroupMemberCount =
      group?.group_member_count != null || group?.groupMemberCount != null
        ? Number(rawMemberCount ?? 0) + 1
        : parsedMemberCount;
    const member_count = Number.isFinite(memberCountFromGroupMemberCount) ? memberCountFromGroupMemberCount : 0;

    const rawSlots = Number(group?.available_slots ?? group?.availableSlots ?? NaN);
    const available_slots = Number.isFinite(rawSlots)
      ? rawSlots
      : Math.max(0, this.maxGroupMembers - (Number.isFinite(member_count) ? member_count : 0));

    const membership =
      group?.membership ??
      group?.my_membership ??
      group?.myMembership ??
      group?.membership_info ??
      group?.membershipInfo ??
      null;

    const normalizedMembership =
      membership && typeof membership === 'object'
        ? {
            id: Number(membership.id ?? membership.membership_id ?? membership.membershipId ?? 0),
            status: (membership.status ?? membership.state ?? '').toString()
          }
        : null;

    let user_role = this.normalizeGroupUserRole(
      group?.user_role ??
        group?.userRole ??
        group?.role ??
        group?.current_user_role ??
        group?.currentUserRole ??
        group?.my_role ??
        group?.myRole
    );
    if (user_role === 'guest' && normalizedMembership) {
      user_role = 'member';
    }

    const group_type = this.normalizeGroupType(group?.group_type ?? group?.groupType ?? group?.type ?? group?.visibility);

    return {
      id,
      group_name: (group?.group_name ?? group?.name ?? group?.title ?? `Group ${id}`).toString(),
      description: (group?.description ?? group?.about ?? '').toString(),
      animal_category: (group?.animal_category ?? group?.animalCategory ?? group?.animal ?? '').toString() as any,
      price_min: Number(group?.price_min ?? group?.priceMin ?? 0),
      price_max: Number(group?.price_max ?? group?.priceMax ?? 0),
      created_at: (group?.created_at ?? group?.createdAt ?? new Date().toISOString()).toString(),
      group_type,
      member_count,
      pending_count: Number(group?.pending_count ?? group?.pendingCount ?? group?.pending_requests ?? 0),
      available_slots,
      status: (group?.status ?? 'approved').toString(),
      applicant_name: group?.applicant_name ?? group?.leader_name ?? group?.leaderName ?? group?.owner_name ?? group?.ownerName,
      user_psn: group?.user_psn ?? group?.userPsn ?? group?.leader_psn ?? group?.leaderPsn,
      user_role,
      membership: normalizedMembership
    };
  }

  // Application management
  static async createApplication(data: LayyahApplicationCreate): Promise<LayyahApplication> {
    const response = await api.post(`${this.baseUrl}/applications`, data);
    const app = response.data.application || response.data;
    return this.normalizeApplication(app);
  }

  static findDuplicateApplication(applications: LayyahApplication[], data: LayyahApplicationCreate): LayyahApplication | null {
    const activeStatuses = new Set(['pending', 'under_review', 'approved', 'disbursed']);

    for (const app of applications) {
      if ((app as any).group_id != null) continue;
      if (!activeStatuses.has((app.status || '').toString())) continue;
      return app;
    }
    return null;
  }

  static async getMyApplications(): Promise<LayyahApplication[]> {
    const response = await api.get(`${this.baseUrl}/applications/me`);
    const apps = response.data.applications || [];
    return apps.map((a: any) => this.normalizeApplication(a));
  }

  static async getAllApplications(): Promise<LayyahApplication[]> {
    const response = await api.get(`${this.baseUrl}/applications`);
    const apps = response.data.applications || [];
    return apps.map((a: any) => this.normalizeApplication(a));
  }

  static async getApplication(id: number): Promise<LayyahApplication> {
    const response = await api.get(`${this.baseUrl}/applications/${id}`);
    const app = response.data.application || response.data;
    return this.normalizeApplication(app);
  }

  static async updateApplication(id: number, data: LayyahApplicationUpdate): Promise<LayyahApplication> {
    const response = await api.put(`${this.baseUrl}/applications/${id}`, data);
    const app = response.data.application || response.data;
    return this.normalizeApplication(app);
  }

  static async deleteApplication(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/applications/${id}`);
  }

  // Admin functions
  static async approveApplication(id: number, approval: LayyahApplicationApproval): Promise<LayyahApplication> {
    const response = await api.put(`${this.baseUrl}/applications/${id}`, approval);
    const app = response.data.application || response.data;
    return this.normalizeApplication(app);
  }

  static async reverseApplicationStatus(id: number, payload: { to_status: 'approved' | 'under_review' | 'pending'; reason: string }): Promise<LayyahApplication> {
    const response = await api.post(`${this.baseUrl}/admin/applications/${id}/reverse`, payload);
    const app = response.data.application || response.data;
    return this.normalizeApplication(app);
  }

  static async getApplicationStats(): Promise<LayyahApplicationStats> {
    const response = await api.get(`${this.baseUrl}/stats`);
    return response.data.data || response.data;
  }

  static async getAdminApplicants(params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    kind?: string;
    date_from?: string;
    date_to?: string;
    amount_min?: string;
    amount_max?: string;
    animal_type?: string;
    price_bracket?: string;
    sort?: 'created_at' | 'animal_type' | 'price_range';
    order?: 'asc' | 'desc';
  }): Promise<{ items: LayyahAdminApplicantRow[]; pagination: PaginationMeta }> {
    const response = await api.get(`${this.baseUrl}/admin/applicants`, { params });
    const items = (response.data.items || []) as LayyahAdminApplicantRow[];
    return {
      items,
      pagination: response.data.pagination || { total: items.length, page: 1, limit: 25, pages: 1 }
    };
  }

  static async exportApplications(
    format: 'csv' | 'xlsx' | 'pdf',
    params?: {
      q?: string;
      status?: string;
      kind?: string;
      date_from?: string;
      date_to?: string;
      amount_min?: string;
      amount_max?: string;
      animal_type?: string;
      price_bracket?: string;
    }
  ): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const response = await api.get(`${this.baseUrl}/applications/export`, {
      params: { ...(params || {}), format },
      responseType: 'blob'
    } as any);

    const contentType = String((response.headers as any)?.['content-type'] || 'application/octet-stream');
    const disposition = String((response.headers as any)?.['content-disposition'] || '');
    const match = disposition.match(/filename=([^;]+)/i);
    const filename = match ? match[1].replace(/(^")|("$)/g, '') : `layyah_applications.${format}`;

    return { blob: response.data as any, filename, contentType };
  }

  static async getCsrfToken(): Promise<string> {
    const response = await api.get(`/auth/csrf`);
    return String(response.data?.csrfToken || '');
  }

  static async updateAppliedAmount(args: {
    memberId: number;
    applicationId: number;
    appliedAmount: number;
    amountVersion: number;
    csrfToken: string;
  }): Promise<{ applied_amount: number; amount_version: number }> {
    const response = await api.patch(
      `${this.baseUrl}/${args.memberId}/amount`,
      { application_id: args.applicationId, applied_amount: args.appliedAmount },
      {
        headers: {
          'If-Match': `W/"${args.amountVersion}"`,
          'X-CSRF-Token': args.csrfToken
        }
      }
    );
    return {
      applied_amount: Number(response.data?.item?.applied_amount),
      amount_version: Number(response.data?.item?.amount_version)
    };
  }

  static openAdminStream(token: string): EventSource {
    const base = (API_URL || '').replace(/\/$/, '');
    const url = `${base}${this.baseUrl}/stream?token=${encodeURIComponent(token)}`;
    return new EventSource(url, { withCredentials: true } as any);
  }

  static async logAdminClientError(payload: any): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/admin/client-error`, payload);
    } catch {}
  }

  // Browse available groups (for joining)
  static async getAvailableGroups(): Promise<LayyahGroupSummary[]> {
    const result = await this.getGroups({ scope: 'available', page: 1, limit: 50 });
    return result.groups;
  }

  static async getGroups(params: {
    scope?: 'available' | 'all' | 'my';
    page?: number;
    limit?: number;
    q?: string;
    animal_category?: AnimalCategory;
    availability?: 'open' | 'full';
    sort?: 'created_at' | 'price_min' | 'price_max' | 'members';
    order?: 'asc' | 'desc';
  }): Promise<{ groups: LayyahGroupSummary[]; pagination: PaginationMeta }> {
    try {
      const response = await api.get(`${this.baseUrl}/groups`, { params });
      return {
        groups: (response.data.groups || []).map((g: any) => this.normalizeGroupSummary(g)),
        pagination: response.data.pagination || { total: 0, page: 1, limit: 10, pages: 0 }
      };
    } catch (error: any) {
      if (params.scope === 'available' && this.isRetryableDiscoveryError(error)) {
        try {
          const response = await api.get(`${this.baseUrl}/applications`);
          const apps = response.data.applications || [];
          const groupsFromApps = apps
            .map((a: any) => this.normalizeApplication(a))
            .filter((a: LayyahApplication) => a.kind === 'group' && a.status === 'approved');

          const summaries = groupsFromApps
            .map((a: any) => this.normalizeGroupSummary(a))
            .filter((g: LayyahGroupSummary) => {
              if (params.q) {
                const q = params.q.toString().trim().toLowerCase();
                const hay = `${g.group_name} ${g.description} ${g.applicant_name || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
              }
              if (params.animal_category && g.animal_category !== params.animal_category) return false;
              if (params.availability === 'open' && g.available_slots <= 0) return false;
              if (params.availability === 'full' && g.available_slots > 0) return false;
              return true;
            });

          const page = Number(params.page ?? 1);
          const limit = Number(params.limit ?? 10);
          const start = (page - 1) * limit;
          const end = start + limit;
          const paged = summaries.slice(start, end);
          const total = summaries.length;
          const pages = limit > 0 ? Math.ceil(total / limit) : 0;

          return {
            groups: paged,
            pagination: { total, page, limit, pages }
          };
        } catch {
          throw error;
        }
      }
      throw error;
    }
  }

  static async getGroupById(groupId: number): Promise<LayyahGroupSummary> {
    const response = await api.get(`${this.baseUrl}/groups/${groupId}`);
    return this.normalizeGroupSummary(response.data.group || response.data);
  }

  // Request to join a group
  static async requestToJoinGroup(groupId: number): Promise<{message: string}> {
    try {
      const response = await api.post(`${this.baseUrl}/groups/${groupId}/join`);
      return response.data;
    } catch (error: any) {
      if (this.isRetryableNotFound(error)) {
        const alternatives = [
          `${this.baseUrl}/groups/${groupId}/join-request`,
          `${this.baseUrl}/groups/${groupId}/request-join`,
          `${this.baseUrl}/applications/${groupId}/join`
        ];

        for (const url of alternatives) {
          try {
            const response = await api.post(url);
            return response.data;
          } catch (e: any) {
            if (!this.isRetryableNotFound(e)) {
              throw e;
            }
          }
        }
      }
      throw error;
    }
  }

  static async leaveGroup(groupId: number): Promise<{message: string}> {
    const response = await api.post(`${this.baseUrl}/groups/${groupId}/leave`);
    return response.data;
  }

  // Get group members
  static async getGroupMembers(groupId: number): Promise<LayyahApplication[]> {
    const response = await api.get(`${this.baseUrl}/groups/${groupId}/members`);
    return response.data.members || [];
  }

  // Approve/reject group membership (group leaders & admins)
  static async manageGroupMembership(memberId: number, action: 'approve' | 'reject', notes?: string): Promise<LayyahApplication> {
    const response = await api.put(`${this.baseUrl}/group-members/${memberId}`, {
      action,
      notes
    });
    return response.data.member || response.data;
  }

  static async respondToGroupInvitation(memberApplicationId: number, action: 'accept' | 'decline'): Promise<{ message: string }> {
    const response = await api.put(`${this.baseUrl}/group-members/${memberApplicationId}/respond`, { action });
    return response.data;
  }

  // Admin: Add member to group
  static async addMemberToGroup(groupId: number, memberPsn: string): Promise<{message: string}> {
    const payload = { member_psn: memberPsn };
    try {
      const response = await api.post(`${this.baseUrl}/groups/${groupId}/add-member`, payload);
      return response.data;
    } catch (error: any) {
      if (this.isRetryableNotFound(error)) {
        const alternatives: Array<{ url: string; data?: any }> = [
          { url: `${this.baseUrl}/groups/${groupId}/invite`, data: payload },
          { url: `${this.baseUrl}/groups/${groupId}/invite-member`, data: payload },
          { url: `${this.baseUrl}/groups/${groupId}/members`, data: payload }
        ];

        for (const alt of alternatives) {
          try {
            const response = await api.post(alt.url, alt.data);
            return response.data;
          } catch (e: any) {
            if (!this.isRetryableNotFound(e)) {
              throw e;
            }
          }
        }
      }
      throw error;
    }
  }

  static async disqualifyMember(memberApplicationId: number, reason: string): Promise<{ message: string }> {
    const response = await api.delete(`${this.baseUrl}/group-members/${memberApplicationId}/disqualify`, {
      data: { reason }
    });
    return response.data;
  }

  static async updateMemberRole(memberApplicationId: number, role: 'leader' | 'member' | 'moderator'): Promise<any> {
    const response = await api.patch(`${this.baseUrl}/group-members/${memberApplicationId}/role`, { role });
    return response.data;
  }

  static async updateGroupSettings(groupId: number, data: { status?: string; notes?: string; settings?: any }): Promise<any> {
    const response = await api.patch(`${this.baseUrl}/groups/${groupId}/settings`, data);
    return response.data;
  }

  static async getSeasonalProgramStatus(): Promise<{enabled: boolean}> {
    const response = await api.get(`${this.baseUrl}/seasonal-program/status`);
    if (response.data && typeof response.data.enabled === 'boolean') {
      return { enabled: response.data.enabled };
    }
    return { enabled: true };
  }

  static async updateSeasonalProgramStatus(enabled: boolean): Promise<{message: string, enabled: boolean}> {
    const response = await api.put(`${this.baseUrl}/seasonal-program/status`, { enabled });
    const message = response.data && typeof response.data.message === 'string'
      ? response.data.message
      : `Seasonal program ${enabled ? 'enabled' : 'disabled'} successfully`;
    const value = response.data && typeof response.data.enabled === 'boolean'
      ? response.data.enabled
      : enabled;
    return {
      message,
      enabled: value
    };
  }

  // Utility functions
  static formatJoinOrInviteError(error: any, fallbackMessage: string): string {
    const status = error?.response?.status;
    if (status === 409) {
      return error?.response?.data?.message || 'Request already exists.';
    }
    if (status === 403) {
      return error?.response?.data?.message || 'You do not have permission to perform this action.';
    }
    if (status === 400) {
      return error?.response?.data?.message || 'Invalid request.';
    }
    return error?.response?.data?.message || fallbackMessage;
  }

  static formatPriceRange(min: number, max: number): string {
    return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`;
  }

  static getAnimalCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      ram: 'Ram',
      sheep: 'Sheep',
      goat: 'Goat',
      cow: 'Cow'
    };
    return labels[category] || category;
  }

  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      submitted: 'Submitted',
      reviewed: 'Under Review',
      under_review: 'Under Review',
      approved: 'Approved',
      disbursed: 'Disbursed',
      rejected: 'Rejected'
    };
    return labels[status] || status;
  }

  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600 bg-yellow-100',
      submitted: 'text-primary-600 bg-primary-100',
      reviewed: 'text-purple-600 bg-purple-100',
      under_review: 'text-purple-600 bg-purple-100',
      approved: 'text-green-600 bg-green-100',
      disbursed: 'text-emerald-700 bg-emerald-100',
      rejected: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  }

  static getGroupMemberStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600 bg-yellow-100',
      accepted: 'text-green-600 bg-green-100',
      declined: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  }
}

export default LayyahService;
