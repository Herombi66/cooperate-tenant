
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../services/settings-api';
import type { TenantSettings } from '../types';

/**
 * Hook for managing tenant settings
 */
export function useSettings() {
  const queryClient = useQueryClient();

  // Get settings query
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['settings'],
    queryFn: () =&gt; settingsApi.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial&lt;TenantSettings&gt;) =&gt;
      settingsApi.updateSettings(newSettings),
      queryClient.setQueryData(['settings'], updatedSettings);
    },
  });

  // Reset settings mutation
  const resetSettingsMutation = useMutation({
    mutationFn: () =&gt; settingsApi.resetSettings(),
    onSuccess: (defaultSettings) =&gt; { 
      queryClient.setQueryData(['settings'], defaultSettings);
    },
  });

  return {
    settings,
    isLoading,
    error,
    refetch,
    updateSettings: updateSettingsMutation.mutateAsync,
    resetSettings: resetSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
    isResetting: resetSettingsMutation.isPending,
    updateError: updateSettingsMutation.error,
    resetError: resetSettingsMutation.error,
  };
}
