import { describe, it, expect } from 'vitest';
import { LayyahService } from './layyahService';

describe('LayyahService permission helpers', () => {
  it('canManageGroupMembers allows owner/admin only', () => {
    expect(LayyahService.canManageGroupMembers({ user_role: 'owner' as any })).toBe(true);
    expect(LayyahService.canManageGroupMembers({ user_role: 'admin' as any })).toBe(true);
    expect(LayyahService.canManageGroupMembers({ user_role: 'member' as any })).toBe(false);
    expect(LayyahService.canManageGroupMembers({ user_role: 'guest' as any })).toBe(false);
  });

  it('canInviteGroupMembers requires manage rights and available slots', () => {
    expect(LayyahService.canInviteGroupMembers({ user_role: 'owner' as any, available_slots: 1 } as any)).toBe(true);
    expect(LayyahService.canInviteGroupMembers({ user_role: 'owner' as any, available_slots: 0 } as any)).toBe(false);
    expect(LayyahService.canInviteGroupMembers({ user_role: 'member' as any, available_slots: 2 } as any)).toBe(false);
  });

  it('canRequestJoin requires guest role, no membership, open slots, and non-restricted type', () => {
    expect(LayyahService.canRequestJoin({
      user_role: 'guest',
      membership: null,
      available_slots: 1,
      group_type: 'public'
    } as any)).toBe(true);

    expect(LayyahService.canRequestJoin({
      user_role: 'member',
      membership: null,
      available_slots: 1,
      group_type: 'public'
    } as any)).toBe(false);

    expect(LayyahService.canRequestJoin({
      user_role: 'guest',
      membership: { id: 1, status: 'pending' },
      available_slots: 1,
      group_type: 'public'
    } as any)).toBe(false);

    expect(LayyahService.canRequestJoin({
      user_role: 'guest',
      membership: null,
      available_slots: 0,
      group_type: 'public'
    } as any)).toBe(false);

    expect(LayyahService.canRequestJoin({
      user_role: 'guest',
      membership: null,
      available_slots: 1,
      group_type: 'restricted'
    } as any)).toBe(false);
  });
});

