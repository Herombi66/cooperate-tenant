import { createContext, useContext, useState, useEffect, ReactNode, FC, useRef } from 'react';
import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';

// Interface for User
interface User {
  id: string;
  psn: string;
  name: string;
  email: string;
  role: string;
  canCreateAnimalRequests?: boolean;
  isDefaultPassword: boolean;
  status: string;
  profileImage?: string;
}

// Interface for Auth Context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (psn: string, password: string) => Promise<void>;
  logout: (options?: { reason?: 'manual' | 'idle' | 'expired'; suppressToast?: boolean }) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create context with proper type
const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_URL } from '../config';

// Configure axios
const API_BASE_URL = API_URL;

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor with proper types
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Log request for debugging
  console.log(`🌐 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  
  return config;
}, (error) => {
  console.error('Request error:', error);
  return Promise.reject(error);
});

// Add response interceptor with proper types
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ Response ${response.status}: ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ Response error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      console.log('🛡️ Unauthorized, clearing token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('iman.idle.lastActivityAt');
      // Don't redirect if we're already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 405) {
      toast.error('Method not allowed. Please contact support.');
    }
    
    return Promise.reject(error);
  }
);

// Auth Provider component
export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const idleIntervalRef = useRef<number | null>(null);
  const warningToastIdRef = useRef<string | null>(null);
  const warningShownRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastActivityWriteRef = useRef<number>(0);
  const logoutInProgressRef = useRef(false);

  const IDLE_TIMEOUT_MS = 60_000;
  const WARNING_BEFORE_MS = 10_000;
  const ACTIVITY_THROTTLE_MS = 1500;
  const LAST_ACTIVITY_KEY = 'iman.idle.lastActivityAt';

  const isMemberRole = (role: string | undefined) => {
    const r = (role || '').toLowerCase();
    return r === 'member' || r === 'user';
  };

  const logSessionEvent = async (event: 'idle_warning' | 'idle_logout', metadata: Record<string, any>) => {
    try {
      await axiosInstance.post('/auth/session-events', {
        event,
        metadata
      });
    } catch {}
  };

  const clearIdleTimers = () => {
    if (idleIntervalRef.current) {
      window.clearInterval(idleIntervalRef.current);
      idleIntervalRef.current = null;
    }
    if (warningToastIdRef.current) {
      try {
        (toast as any).dismiss?.(warningToastIdRef.current);
      } catch {}
      warningToastIdRef.current = null;
    }
    warningShownRef.current = false;
  };

  const recordActivity = () => {
    const now = Date.now();
    if (now - lastActivityWriteRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityWriteRef.current = now;
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {}
    warningShownRef.current = false;
    if (warningToastIdRef.current) {
      try {
        (toast as any).dismiss?.(warningToastIdRef.current);
      } catch {}
      warningToastIdRef.current = null;
    }
  };

  const testBackendConnection = async (): Promise<boolean> => {
    try {
      console.log('🔌 Testing backend connection...');
      // Try both /health and /api/health endpoints
      const response = await axiosInstance.get('/health');
      console.log('✅ Backend connection successful:', response.data);
      return true;
    } catch (error) {
      console.warn('❌ /health failed, trying /api/health...');
      try {
        const response = await axiosInstance.get('/api/health');
        console.log('✅ Backend connection successful via /api/health:', response.data);
        return true;
      } catch (apiError) {
        console.warn('❌ Backend connection failed completely:', apiError);
        return false;
      }
    }
  };

  const fetchUserProfile = async (): Promise<void> => {
    try {
      const backendAvailable = await testBackendConnection();

      if (backendAvailable) {
        console.log('📡 Fetching user profile...');
        const response = await axiosInstance.get('/auth/me');
        const userData = response.data.user || response.data;
        
        console.log('👤 User profile received:', userData);
        
        const userObj = {
          id: userData.id?.toString() || '1',
          psn: userData.psn || 'ADMIN001',
          name: userData.name || 'Admin User',
          email: userData.email || 'admin@example.com',
          role: userData.role || 'admin',
          canCreateAnimalRequests: userData.can_create_animal_requests || userData.canCreateAnimalRequests || false,
          isDefaultPassword: userData.is_default_password || userData.isDefaultPassword || false,
          status: userData.status || 'active',
          profileImage: userData.profile_image || userData.profileImage
        };
        
        setUser(userObj);
        setIsAuthenticated(true);
        
        // Store user in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(userObj));
      } else {
        console.log('⚡ Using mock user data for development');
        // Mock user for development
        const mockUser = {
          id: '1',
          psn: 'ADMIN001',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          canCreateAnimalRequests: false,
          isDefaultPassword: false,
          status: 'active'
        };
        
        setUser(mockUser);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(mockUser));
      }
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error);
      
      // If it's a 401 error, clear everything and redirect to login
      if ((error as any).response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        toast.error('Session expired. Please login again.');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else {
        // For other errors, keep the user logged in but show warning
        console.warn('Profile fetch failed, but user remains authenticated');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (psn: string, password: string): Promise<void> => {
    try {
      console.log('🔐 Attempting login...');
      console.log('📤 Sending to:', `${API_BASE_URL}/auth/login`);
      console.log('👤 Login with PSN:', psn);
      
      const response = await axiosInstance.post('/auth/login', { psn, password });
      console.log('✅ Login response received:', response.data);
      
      // Handle both field names: access_token or token
      const token = response.data.access_token || response.data.token;
      const userData = response.data.user;
      
      if (!token) {
        console.error('❌ No token field found in response');
        throw new Error('Login failed: No authentication token received');
      }
      
      // Store token
      localStorage.setItem('token', token);
      console.log('💾 Token stored in localStorage');
      
      // Create user object
      const userObj = {
        id: userData?.id?.toString() || '1',
        psn: userData?.psn || psn,
        name: userData?.name || 'User',
        email: userData?.email || '',
        role: userData?.role || 'user',
        isDefaultPassword: userData?.is_default_password || userData?.isDefaultPassword || false,
        status: userData?.status || 'active',
        profileImage: userData?.profile_image || userData?.profileImage
      };
      
      console.log('👤 User object created:', userObj);
      
      // Update state
      setUser(userObj);
      setIsAuthenticated(true);
      
      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(userObj));
      
      toast.success(`Welcome back, ${userData?.name || userObj.name}!`);
      
      // Force page reload to ensure proper initialization
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      let message = 'Login failed';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
      throw new Error(message);
    }
  };

  const logout = (options?: { reason?: 'manual' | 'idle' | 'expired'; suppressToast?: boolean }): void => {
    const reason = options?.reason || 'manual';
    console.log('🚪 Logging out...', { reason });
    clearIdleTimers();
    try {
      axiosInstance.post('/auth/logout').catch(() => {});
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    setIsAuthenticated(false);
    if (!options?.suppressToast) {
      if (reason === 'idle') toast.error('You were logged out due to inactivity.');
      else if (reason === 'expired') toast.error('Session expired. Please login again.');
      else toast.success('Successfully logged out');
    }
    
    // Redirect to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      console.log('🔑 Changing password...');
      const response = await axiosInstance.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: newPassword
      });
      
      // Update token if a new one is returned
      const newToken = response.data.access_token || response.data.token;
      if (newToken) {
        localStorage.setItem('token', newToken);
        console.log('🔄 Token updated after password change');
      }

      // Update user state to reflect password change (no longer default password)
      if (user) {
        const updatedUser = { ...user, isDefaultPassword: false };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('✅ User state updated: isDefaultPassword = false');
      }
      
      toast.success('Password changed successfully');
    } catch (error: any) {
      console.error('❌ Password change failed:', error);
      
      let message = 'Failed to change password';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
      throw new Error(message);
    }
  };

  const refreshUser = async (): Promise<void> => {
    console.log('🔄 Refreshing user data...');
    await fetchUserProfile();
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🚀 Initializing authentication...');
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      console.log('📋 Stored token:', token ? 'Yes' : 'No');
      console.log('📋 Stored user:', storedUser ? 'Yes' : 'No');
      
      if (token && storedUser) {
        try {
          // Try to restore from localStorage first
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          console.log('✅ Restored user from localStorage:', parsedUser.name);
          
          // Then fetch fresh data from server
          await fetchUserProfile();
        } catch (error) {
          console.error('❌ Error parsing stored user:', error);
          localStorage.clear();
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } else {
        console.log('👤 No stored credentials, user is not authenticated');
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || !isMemberRole(user.role)) {
      clearIdleTimers();
      return;
    }

    logoutInProgressRef.current = false;
    const existingRaw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const storedLast = Number(existingRaw || Date.now());
    lastActivityRef.current = Number.isFinite(storedLast) ? storedLast : Date.now();
    if (!existingRaw) {
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
      } catch {}
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LAST_ACTIVITY_KEY) return;
      const ts = Number(e.newValue);
      if (Number.isFinite(ts)) {
        lastActivityRef.current = ts;
        if (warningToastIdRef.current) {
          try {
            (toast as any).dismiss?.(warningToastIdRef.current);
          } catch {}
          warningToastIdRef.current = null;
        }
        warningShownRef.current = false;
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const activityHandler = () => recordActivity();
    for (const ev of activityEvents) window.addEventListener(ev, activityHandler, { passive: true });
    window.addEventListener('focus', activityHandler);
    window.addEventListener('storage', onStorage);

    const checkIdle = () => {
      if (logoutInProgressRef.current) return;
      const now = Date.now();
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || lastActivityRef.current || now);
      const idleFor = now - last;
      const warnAt = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS;

      if (!warningShownRef.current && idleFor >= warnAt && idleFor < IDLE_TIMEOUT_MS) {
        warningShownRef.current = true;
        const secondsLeft = Math.max(1, Math.ceil((IDLE_TIMEOUT_MS - idleFor) / 1000));
        const id = (toast as any)(
          `Inactive session: you will be logged out in ${secondsLeft}s.`,
          { duration: WARNING_BEFORE_MS - 500 }
        );
        warningToastIdRef.current = typeof id === 'string' ? id : null;
        logSessionEvent('idle_warning', {
          idle_for_ms: idleFor,
          seconds_left: secondsLeft,
          path: window.location.pathname,
          visibility: document.visibilityState
        });
      }

      if (idleFor >= IDLE_TIMEOUT_MS) {
        logoutInProgressRef.current = true;
        logSessionEvent('idle_logout', {
          idle_for_ms: idleFor,
          path: window.location.pathname,
          visibility: document.visibilityState
        }).finally(() => {
          logout({ reason: 'idle', suppressToast: false });
        });
      }
    };

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') checkIdle();
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    idleIntervalRef.current = window.setInterval(checkIdle, 1000);

    return () => {
      clearIdleTimers();
      for (const ev of activityEvents) window.removeEventListener(ev, activityHandler as any);
      window.removeEventListener('focus', activityHandler as any);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [isAuthenticated, user?.id, user?.role]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated,
      login, 
      logout, 
      changePassword, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
