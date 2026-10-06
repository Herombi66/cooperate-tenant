import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export interface ModulePermission {
  read: boolean;
  write: boolean;
  edit: boolean;
  delete: boolean;
  moduleName?: string;
  routePath?: string;
}

export type PermissionAction = 'read' | 'write' | 'edit' | 'delete';

interface PermissionContextType {
  permissions: Record<string, ModulePermission>;
  isAdmin: boolean;
  roles: string[];
  isLoading: boolean;
  can: (moduleKey: string, action?: PermissionAction) => boolean;
  canAccess: (moduleKey: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPermissions({});
      setIsAdmin(false);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    // Admins and Super Admins inherently have full access
    if (user.role === 'admin' || user.role === 'super_admin') {
      setIsAdmin(true);
      setRoles([user.role]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/rbac/my-permissions');
      if (res.data?.success) {
        setPermissions(res.data.permissions || {});
        setIsAdmin(!!res.data.isAdmin);
        setRoles(res.data.roles || [user.role]);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch user permissions, using role fallback:', error);
      // Fallback: If network fails, allow based on role
      setIsAdmin(user.role === 'admin' || user.role === 'super_admin');
      setRoles([user.role]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Check if user can perform action ('read', 'write', 'edit', 'delete') on moduleKey
   */
  const can = useCallback((moduleKey: string, action: PermissionAction = 'read'): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'super_admin' || isAdmin) return true;

    const modPerm = permissions[moduleKey];
    if (!modPerm) {
      return false;
    }

    return !!modPerm[action];
  }, [user, isAdmin, permissions]);

  /**
   * Check if user can view/access the module (shorthand for can(module, 'read'))
   */
  const canAccess = useCallback((moduleKey: string): boolean => {
    return can(moduleKey, 'read');
  }, [can]);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        isAdmin,
        roles,
        isLoading,
        can,
        canAccess,
        refreshPermissions: fetchPermissions
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
