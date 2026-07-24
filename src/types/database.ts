// ============================================================
// منصة الحديث الشريف — أنواع قاعدة البيانات
// Interactive Hadith Memorization Platform — Database Types
// ============================================================

// ─── Enums ────────────────────────────────────────────────────

export type UserRole = 'student' | 'admin';

export type HadithGrade = 'sahih' | 'hasan' | 'daif';

export type HadithLength = 'short' | 'long';

export type ReportReason = 'incorrect_recitation' | 'poor_quality' | 'inappropriate' | 'other';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type ContentErrorType = 'tashkeel' | 'translation' | 'isnad' | 'takhrij' | 'other';

export type ContentReportStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export type AnnotationType = 'text' | 'audio';

export type AnnotationStatus = 'pending' | 'approved' | 'rejected';

// ─── Tables ───────────────────────────────────────────────────

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  consent_given_at: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: number;
  name_ar: string;
  name_id: string | null;
  slug: string;
  sort_order: number;
}

export interface Book {
  id: number;
  collection_id: number;
  name_ar: string;
  name_id: string | null;
  sort_order: number;
}

export interface Chapter {
  id: number;
  book_id: number;
  name_ar: string;
  name_id: string | null;
  sort_order: number;
}

export interface Hadith {
  id: string;
  chapter_id: number;
  hadith_number: number;
  isnad_ar: string;
  matn_ar: string;
  translation_id: string | null;
  grade: HadithGrade | null;
  explanation: string | null;
  length_class: HadithLength;
  source_api: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface WordDefinition {
  id: number;
  hadith_id: string;
  word: string;
  definition_ar: string;
  definition_id: string | null;
  audio_url: string | null;
}

export interface TakhrijReference {
  id: number;
  hadith_id: string;
  source_book: string;
  reference_number: string | null;
  grade: string | null;
}

export interface Recording {
  id: string;
  hadith_id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
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

export interface RecordingListen {
  id: string;
  recording_id: string;
  user_id: string | null;
  listened_at: string;
}

export interface Report {
  id: string;
  recording_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ContentReport {
  id: string;
  hadith_id: string;
  reporter_id: string;
  error_type: ContentErrorType;
  description: string;
  status: ContentReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Annotation {
  id: string;
  hadith_id: string;
  user_id: string;
  type: AnnotationType;
  content: string | null;
  file_path: string | null;
  status: AnnotationStatus;
  created_at: string;
}

// ─── API Helpers ──────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
}

export interface RecordingWithProfile extends Recording {
  profile: Pick<Profile, 'id' | 'display_name'>;
}

export interface RecordingWithFlags extends Recording {
  is_liked_by_me: boolean;
  is_favorited_by_me: boolean;
  is_my_recording: boolean;
}

export interface HadithDetail extends Hadith {
  word_definitions: WordDefinition[];
  takhrij_references: TakhrijReference[];
}

export interface ChapterWithHadithCount extends Chapter {
  hadith_count: number;
}

export interface BookWithChapterCount extends Book {
  chapter_count: number;
}

export interface CollectionWithBookCount extends Collection {
  book_count: number;
}

// ─── Supabase Database Shape ────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      collections: { Row: Collection; Insert: Partial<Collection>; Update: Partial<Collection> };
      books: { Row: Book; Insert: Partial<Book>; Update: Partial<Book> };
      chapters: { Row: Chapter; Insert: Partial<Chapter>; Update: Partial<Chapter> };
      hadiths: { Row: Hadith; Insert: Partial<Hadith>; Update: Partial<Hadith> };
      word_definitions: { Row: WordDefinition; Insert: Partial<WordDefinition>; Update: Partial<WordDefinition> };
      takhrij_references: { Row: TakhrijReference; Insert: Partial<TakhrijReference>; Update: Partial<TakhrijReference> };
      recordings: { Row: Recording; Insert: Partial<Recording>; Update: Partial<Recording> };
      likes: { Row: Like; Insert: Partial<Like>; Update: Partial<Like> };
      favorite_recordings: { Row: FavoriteRecording; Insert: Partial<FavoriteRecording>; Update: Partial<FavoriteRecording> };
      recording_listens: { Row: RecordingListen; Insert: Partial<RecordingListen>; Update: Partial<RecordingListen> };
      reports: { Row: Report; Insert: Partial<Report>; Update: Partial<Report> };
      content_reports: { Row: ContentReport; Insert: Partial<ContentReport>; Update: Partial<ContentReport> };
      app_settings: { Row: AppSetting; Insert: Partial<AppSetting>; Update: Partial<AppSetting> };
      annotations: { Row: Annotation; Insert: Partial<Annotation>; Update: Partial<Annotation> };
    };
    Enums: {
      user_role: UserRole;
      hadith_grade: HadithGrade;
      hadith_length: HadithLength;
      report_reason: ReportReason;
      report_status: ReportStatus;
      content_error_type: ContentErrorType;
      content_report_status: ContentReportStatus;
      annotation_type: AnnotationType;
      annotation_status: AnnotationStatus;
    };
  };
}
