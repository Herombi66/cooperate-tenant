/// <reference types="vite/client" />

declare const __BUILD_SHA__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENVIRONMENT: string
  readonly VITE_MAX_FILE_SIZE: string
  readonly VITE_ALLOWED_FILE_TYPES: string
  readonly VITE_ENABLE_EXCEL_IMPORT: string
  readonly VITE_ENABLE_BULK_OPERATIONS: string
  readonly VITE_ENABLE_NOTIFICATIONS: string
  readonly VITE_ITEMS_PER_PAGE: string
  readonly VITE_SIDEBAR_COLLAPSED_DEFAULT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
