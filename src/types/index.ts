export interface Profile {
  id: string;
  display_name: string;
  real_name: string | null;
  email: string | null;
  role: 'student' | 'admin';
  avatar_url: string | null;
  consent_given_at: string | null;
  last_active_at: string | null;
  created_at: string;
}

export interface Collection {
  id: number;
  name_ar: string;
  name_id: string | null;
  description_ar: string | null;
  sort_order: number;
  books_count?: number;
}

export interface Book {
  id: number;
  collection_id: number;
  name_ar: string;
  name_id: string | null;
  sort_order: number;
  chapters_count?: number;
}

export interface Chapter {
  id: number;
  book_id: number;
  name_ar: string;
  name_id: string | null;
  sort_order: number;
  hadiths_count?: number;
}

export interface Hadith {
  id: string;
  chapter_id: number;
  hadith_number: number;
  matn_ar: string;
  isnad_ar: string | null;
  translation_id: string | null;
  grade: 'sahih' | 'hasan' | 'daif' | string;
  explanation_ar: string | null;
  length_class: 'short' | 'long';
  word_definitions?: WordDefinition[];
  takhrij_references?: TakhrijReference[];
  recordings_count?: number;
}

export interface WordDefinition {
  id: string;
  hadith_id: string;
  word: string;
  meaning_ar: string;
  meaning_id: string | null;
  audio_url: string | null;
}

export interface TakhrijReference {
  id: string;
  hadith_id: string;
  source_book: string;
  reference_number: string;
  grade: string | null;
}

export interface Recording {
  id: string;
  hadith_id: string;
  user_id: string;
  file_url: string;
  file_path: string;
  duration_seconds: number;
  file_size_bytes: number;
  codec: string;
  bitrate_kbps: number;
  likes_count: number;
  listens_count: number;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  is_community_best: boolean;
  created_at: string;
  // Joined fields
  display_name?: string;
  is_liked_by_me?: boolean;
  is_favorited_by_me?: boolean;
  is_mine?: boolean;
  selection_layer?: 'favorite' | 'verified' | 'community' | 'latest';
  favorites_count?: number;
}

export interface DefaultRecording extends Recording {
  recording_id: string;
  selection_layer: 'favorite' | 'verified' | 'community' | 'latest';
  favorite_recordings?: Recording[];
}

export interface Like {
  id: string;
  recording_id: string;
  user_id: string;
  created_at: string;
}

export interface FavoriteRecording {
  id: string;
  recording_id: string;
  user_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  recording_id: string;
  reporter_id: string;
  reason: 'incorrect_recitation' | 'poor_quality' | 'inappropriate' | 'other';
  details: string | null;
  status: 'open' | 'dismissed' | 'resolved';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ContentReport {
  id: string;
  hadith_id: string;
  reporter_id: string;
  error_type: 'tashkeel' | 'translation' | 'isnad' | 'takhrij' | 'other';
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: any;
  updated_by: string | null;
  updated_at: string | null;
}

export interface ReportQueueItem {
  recording_id: string;
  hadith_id: string;
  hadith_excerpt: string;
  owner_real_name: string;
  owner_email: string;
  owner_display_name: string;
  report_count: number;
  reasons: string[];
  is_hidden: boolean;
  is_verified: boolean;
  oldest_report_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: string[];
}

export type ReportStatus = 'open' | 'dismissed' | 'resolved';
export type ContentReportStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';
export type SortOption = 'top' | 'most_listened' | 'latest';
export type ReportAction = 'dismiss' | 'hide' | 'delete_recording' | 'restore';
