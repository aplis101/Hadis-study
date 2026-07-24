export const SITE_NAME = 'منصة الحديث الشريف';
export const SITE_DESCRIPTION = 'منصة تفاعلية لحفظ الحديث الشريف';
export const DEFAULT_LOCALE = 'ar';
export const DEFAULT_DIR = 'rtl' as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
  PROFILE: '/profile',
  COLLECTIONS: '/collections',
  COLLECTION: (id: number) => `/collections/${id}` as const,
  BOOK: (id: number) => `/books/${id}` as const,
  HADITH: (id: string) => `/hadiths/${id}` as const,
  ADMIN: '/admin',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_CONTENT_REPORTS: '/admin/content-reports',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

export const RECORDING_LIMITS = {
  short: {
    maxDurationSeconds: 30,
    maxFileSizeBytes: 2 * 1024 * 1024, // 2 MB
  },
  long: {
    maxDurationSeconds: 180,
    maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
  },
} as const;

export const APP_SETTINGS_KEYS = {
  UPLOAD_ENABLED: 'upload_enabled',
  REPORT_ALERT_RATIO: 'report_alert_ratio',
  REPORT_ALERT_MIN: 'report_alert_min',
  REPORT_HIDE_RATIO: 'report_hide_ratio',
  REPORT_HIDE_MIN: 'report_hide_min',
  COMMUNITY_BEST_MIN_LIKES: 'community_best_min_likes',
  ACTIVE_USERS_WINDOW_DAYS: 'active_users_window_days',
  RATE_LIMIT_UPLOADS_PER_HOUR: 'rate_limit_uploads_per_hour',
  LISTEN_COUNT_THRESHOLD_SECONDS: 'listen_count_threshold_seconds',
} as const;

export const STORAGE_BUCKETS = {
  AUDIO: 'audio',
} as const;

export const SUPABASE_STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;
