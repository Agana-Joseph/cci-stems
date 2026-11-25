// ============================================================================
// CCI STEM Connect — Backend REST API v1 TypeScript Contracts
// Aligned with Frontend API Integration Guide v1.0
// ============================================================================

export type EventStatus = "draft" | "active" | "completed" | "archived";
export type RegistrationSource = "form" | "whatsapp" | "manual" | "import";
export type RegistrationStatus = "registered" | "confirmed" | "cancelled" | "waitlisted";
export type AttendanceStatus = "confirmed" | "partial" | "absent" | "unverified";

export type QuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "yes_no"
  | "rating_scale"
  | "numeric"
  | "date";

export type QuestionnaireType = "post_event" | "follow_up" | "reflection" | "custom";
export type QuestionnaireStatus = "draft" | "published" | "archived";
export type SubmissionStatus = "in_progress" | "submitted" | "validated";

export type ImpactCategory = "immediate" | "application" | "sustained";
export type ScoringRuleType =
  | "rating_scale"
  | "yes_no"
  | "single_choice"
  | "multiple_choice"
  | "numeric_threshold"
  | "value_map";
export type ScoreStatus = "calculated" | "partial" | "insufficient_data" | "missing";
export type ScoreScope = "immediate" | "follow_up" | "combined";

export type FollowUpStatus = "scheduled" | "pending" | "completed" | "overdue" | "skipped";
export type EvidenceClassification = "self_reported" | "documented" | "verified";
export type VerificationStatus = "unverified" | "pending_review" | "verified" | "rejected";

export type ActionStatus = "intended" | "in_progress" | "completed" | "abandoned";
export type ActionCategory =
  | "idea_implementation"
  | "habit_change"
  | "knowledge_sharing"
  | "workplace_improvement"
  | "career_goal";

export type ConnectionType =
  | "peer"
  | "speaker"
  | "mentor"
  | "mentee"
  | "collaborator"
  | "opportunity";

export type OutcomeType =
  | "productivity_gain"
  | "collaboration"
  | "mentorship"
  | "career_advancement"
  | "workplace_policy"
  | "knowledge_transfer"
  | "other";

export type ExportFormat = "json" | "csv" | "xlsx";
export type CoverageLevel = "none" | "low" | "moderate" | "high";

// ----------------------------------------------------------------------------
// Standard Envelopes
// ----------------------------------------------------------------------------

export interface PaginationMeta {
  total?: number;
  limit?: number;
  offset?: number;
  has_more?: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: PaginationMeta | null;
  request_id: string | null;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown;
  };
  request_id: string | null;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
}

// ----------------------------------------------------------------------------
// Events
// ----------------------------------------------------------------------------

export interface EventRead {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  event_type?: string | null;
  event_date: string;
  end_date?: string | null;
  location?: string | null;
  status: EventStatus;
  metadata_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventCreate {
  slug: string;
  title: string;
  description?: string | null;
  event_type?: string | null;
  event_date: string;
  end_date?: string | null;
  location?: string | null;
  status?: EventStatus;
  metadata_json?: Record<string, unknown>;
}

export type EventUpdate = Partial<EventCreate>;

export interface EventParticipantSummary {
  participant_id: string;
  full_name: string;
  email_normalised?: string | null;
  phone_normalised?: string | null;
  current_role?: string | null;
  industry?: string | null;
  organisation?: string | null;
  registration_status?: RegistrationStatus | null;
  registration_source?: RegistrationSource | null;
  attendance_status?: AttendanceStatus | null;
}

export interface EventRegistrationCreate {
  participant_id: string;
  registration_source?: RegistrationSource;
  registration_status?: RegistrationStatus;
  reason_for_attending?: string | null;
}

export interface EventAttendanceUpsert {
  participant_id: string;
  attendance_status?: AttendanceStatus;
  check_in_at?: string | null;
  check_out_at?: string | null;
  verification_source?: string | null;
  notes?: string | null;
}

// ----------------------------------------------------------------------------
// Participants
// ----------------------------------------------------------------------------

export interface ParticipantRead {
  id: string;
  full_name: string;
  email?: string | null;
  email_normalised?: string | null;
  phone?: string | null;
  phone_normalised?: string | null;
  current_role?: string | null;
  industry?: string | null;
  organisation?: string | null;
  years_of_experience?: number | null;
  reason_for_attending?: string | null;
  consent_given?: boolean;
  data_source?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ParticipantCreate {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  current_role?: string | null;
  industry?: string | null;
  organisation?: string | null;
  years_of_experience?: number | null;
  reason_for_attending?: string | null;
  consent_given?: boolean;
  event_id?: string | null;
}

export type ParticipantUpdate = Partial<Omit<ParticipantCreate, "event_id">>;

export interface ParticipantLookupPublicResponse {
  message: string;
  otp_required?: boolean;
  next_step?: string;
}

export interface ParticipantLookupAdminResponse {
  matched: boolean;
  match_channel?: string | null;
  participant_id?: string | null;
  full_name?: string | null;
  registered_event_ids?: string[];
  message: string;
}

export interface ParticipantImportError {
  row_number: number;
  field?: string | null;
  message: string;
}

export interface ParticipantImportResult {
  dry_run: boolean;
  total_rows: number;
  valid_rows: number;
  created_count?: number;
  updated_count?: number;
  duplicate_count: number;
  error_count?: number;
  errors: ParticipantImportError[];
  preview_records?: Array<Record<string, unknown>>;
}

// ----------------------------------------------------------------------------
// Pillars
// ----------------------------------------------------------------------------

export interface MeasurementPillarRead {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  impact_category: ImpactCategory;
  default_weight: number;
  display_order?: number;
  is_active?: boolean;
}

// ----------------------------------------------------------------------------
// Question Cards, Questions & Questionnaires
// ----------------------------------------------------------------------------

export interface QuestionOptionRead {
  id?: string;
  option_value: string;
  option_label: string;
  score_value?: number | null;
  display_order: number;
  is_active: boolean;
}

export interface QuestionRead {
  id: string;
  code: string;
  question_text: string;
  description?: string | null;
  question_type: QuestionType;
  card_id?: string | null;
  category?: string | null;
  is_required: boolean;
  is_scorable: boolean;
  is_archived?: boolean;
  allow_explanation: boolean;
  explanation_prompt?: string | null;
  validation_config?: { min?: number; max?: number; [key: string]: unknown } | null;
  scoring_config?: Record<string, unknown> | null;
  display_order: number;
  pillar_ids?: string[];
  pillars?: MeasurementPillarRead[];
  options?: QuestionOptionRead[];
}

export interface QuestionCreate {
  code: string;
  question_text: string;
  description?: string | null;
  question_type: QuestionType;
  card_id?: string | null;
  category?: string | null;
  is_required?: boolean;
  is_scorable?: boolean;
  allow_explanation?: boolean;
  explanation_prompt?: string | null;
  validation_config?: Record<string, unknown> | null;
  scoring_config?: Record<string, unknown> | null;
  display_order?: number;
  pillar_ids?: string[];
  options?: QuestionOptionRead[];
}

export type QuestionUpdate = Partial<QuestionCreate>;

export interface QuestionCardRead {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  category?: string | null;
  is_active: boolean;
  display_order: number;
  questions?: QuestionRead[];
}

export interface QuestionCardCreate {
  code: string;
  title: string;
  description?: string | null;
  category?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export type QuestionCardUpdate = Partial<QuestionCardCreate>;

export interface QuestionnaireSectionRead {
  id: string;
  code?: string;
  title: string;
  description?: string | null;
  display_order: number;
}

export interface QuestionnaireQuestionItem {
  id?: string;
  question_id?: string;
  section_id?: string | null;
  is_required_override?: boolean | null;
  display_order: number;
  question: QuestionRead;
}

export interface QuestionnaireRead {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  event_id?: string | null;
  questionnaire_type: QuestionnaireType;
  status: QuestionnaireStatus;
  version?: number;
  sections?: QuestionnaireSectionRead[];
  questions?: QuestionnaireQuestionItem[];
  created_at?: string;
  updated_at?: string;
}

export interface QuestionnaireSectionInput {
  code?: string;
  title: string;
  description?: string | null;
  display_order: number;
}

export interface QuestionnaireQuestionInput {
  question_id: string;
  section_code?: string | null;
  section_id?: string | null;
  is_required_override?: boolean | null;
  display_order: number;
}

export interface QuestionnaireCreate {
  code: string;
  title: string;
  description?: string | null;
  event_id?: string | null;
  questionnaire_type: QuestionnaireType;
  sections?: QuestionnaireSectionInput[];
  questions?: QuestionnaireQuestionInput[];
}

export type QuestionnaireUpdate = Partial<QuestionnaireCreate>;

// ----------------------------------------------------------------------------
// Assessments
// ----------------------------------------------------------------------------

export interface AssessmentResponseInput {
  question_id: string;
  response_text?: string | null;
  response_numeric?: number | null;
  response_boolean?: boolean | null;
  response_date?: string | null;
  response_json?: string[] | Record<string, unknown> | null;
  explanation_text?: string | null;
}

export interface ProfileUpdatesInput {
  full_name?: string;
  current_role?: string;
  industry?: string;
  organisation?: string;
  years_of_experience?: number | null;
  reason_for_attending?: string;
  consent_given?: boolean;
}

export interface AssessmentSubmitRequest {
  participant_id?: string;
  phone?: string;
  email?: string;
  event_id: string;
  questionnaire_id: string;
  submission_channel?: string;
  started_at?: string;
  profile_updates?: ProfileUpdatesInput;
  responses: AssessmentResponseInput[];
}

export interface AssessmentResponseRead extends AssessmentResponseInput {
  id: string;
  question_code?: string;
  question_text?: string;
  created_at?: string;
}

export interface AssessmentSubmissionRead {
  id: string;
  participant_id: string;
  event_id: string;
  questionnaire_id: string;
  status: SubmissionStatus;
  submission_channel?: string | null;
  started_at?: string | null;
  submitted_at?: string | null;
  responses?: AssessmentResponseRead[];
}

// ----------------------------------------------------------------------------
// Scoring
// ----------------------------------------------------------------------------

export interface ScoringDimension {
  id?: string;
  pillar_id: string;
  pillar_code?: string;
  pillar_name?: string;
  weight: number;
  min_questions_required?: number;
}

export interface ScoringRule {
  id?: string;
  question_id?: string | null;
  question_code?: string | null;
  pillar_id?: string | null;
  rule_type: ScoringRuleType;
  config_json?: Record<string, unknown>;
  max_score?: number;
  is_active?: boolean;
}

export interface ScoringFrameworkRead {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  version: number | string;
  is_active: boolean;
  minimum_pillars_required?: number;
  dimensions: ScoringDimension[];
  rules: ScoringRule[];
  created_at?: string;
}

export interface ScoringFrameworkCreate {
  code: string;
  name: string;
  description?: string | null;
  version?: number | string;
  is_active?: boolean;
  minimum_pillars_required?: number;
  dimensions: Array<{ pillar_id: string; weight: number; min_questions_required?: number }>;
  rules?: ScoringRule[];
}

export type ScoringFrameworkUpdate = Partial<ScoringFrameworkCreate>;

export interface PillarScoreItem {
  pillar_id: string;
  pillar_code?: string;
  pillar_name?: string;
  raw_score?: number | null;
  normalised_score: number | null;
  weight: number;
  effective_weight?: number | null;
  weight_renormalised?: boolean;
  status: ScoreStatus;
  questions_answered?: number;
  questions_expected?: number;
}

export interface ParticipantImpactScoreRead {
  id: string;
  participant_id: string;
  event_id: string;
  framework_id: string;
  assessment_submission_id?: string | null;
  score_scope?: ScoreScope;
  overall_score: number | null;
  immediate_score?: number | null;
  application_score?: number | null;
  sustained_score?: number | null;
  score_status: ScoreStatus;
  weight_renormalised?: boolean;
  completeness_ratio?: number | null;
  pillar_scores?: PillarScoreItem[];
  calculated_at: string;
}

export interface EventBulkCalculationResult {
  event_id: string;
  framework_id?: string;
  participants_processed: number;
  scores_calculated: number;
  insufficient_data_count?: number;
  errors?: Array<{ participant_id: string; message: string }>;
}

// ----------------------------------------------------------------------------
// Follow-Ups & Impact Tracking
// ----------------------------------------------------------------------------

export interface FollowUpStageRead {
  id: string;
  event_id?: string | null;
  stage_code: string;
  stage_name: string;
  days_after_event: number;
  questionnaire_id?: string | null;
  display_order: number;
}

export interface FollowUpStageCreate {
  event_id?: string | null;
  stage_code: string;
  stage_name: string;
  days_after_event: number;
  questionnaire_id?: string | null;
  display_order?: number;
}

export interface FollowUpRead {
  id: string;
  participant_id: string;
  event_id: string;
  follow_up_stage: string;
  due_date?: string | null;
  status: FollowUpStatus;
  completed_at?: string | null;
  created_at?: string;
  submissions?: Array<{
    id: string;
    assessment_date?: string;
    responses?: Record<string, unknown>;
    reported_actions?: Array<Record<string, unknown>>;
    outcome_descriptions?: string | null;
    outcome_type?: OutcomeType | null;
    evidence_classification?: EvidenceClassification;
    created_at?: string;
  }>;
}

export interface FollowUpScheduleCreate {
  participant_id: string;
  event_id: string;
  follow_up_stage?: string;
  due_date?: string;
  status?: FollowUpStatus;
}

export interface FollowUpSubmitRequest {
  assessment_date?: string;
  assessment_submission_id?: string;
  responses: Record<string, unknown>;
  reported_actions?: Array<{
    category: ActionCategory;
    description: string;
    action_status?: ActionStatus;
    target_date?: string;
  }>;
  outcome_descriptions?: string;
  outcome_type?: OutcomeType;
  evidence_items?: Array<{
    evidence_type: string;
    description?: string;
    reference_url?: string;
  }>;
  evidence_classification?: EvidenceClassification;
}

export interface ImpactActionCreate {
  participant_id?: string;
  phone?: string;
  email?: string;
  event_id: string;
  category: ActionCategory;
  description: string;
  action_status?: ActionStatus;
  target_date?: string | null;
  evidence_classification?: EvidenceClassification;
}

export interface ImpactActionUpdate {
  action_status?: ActionStatus;
  description?: string;
  target_date?: string | null;
  evidence_classification?: EvidenceClassification;
}

export interface ImpactConnectionCreate {
  participant_id?: string;
  phone?: string;
  email?: string;
  event_id: string;
  connection_type: ConnectionType;
  contact_role?: string | null;
  contact_organisation?: string | null;
  follow_up_conversation?: boolean;
  collaboration_started?: boolean;
  opportunity_discovered?: boolean;
  notes?: string | null;
  evidence_classification?: EvidenceClassification;
}

export interface ImpactOutcomeCreate {
  participant_id?: string;
  phone?: string;
  email?: string;
  event_id: string;
  outcome_type: OutcomeType;
  description: string;
  evidence_items?: Array<{
    evidence_type: string;
    description?: string;
    reference_url?: string;
  }>;
}

export interface OutcomeEvidenceCreate {
  evidence_type: string;
  description?: string | null;
  reference_url?: string | null;
}

export interface OutcomeVerifyUpdate {
  verification_status: VerificationStatus;
  verification_notes?: string | null;
}

// ----------------------------------------------------------------------------
// Analytics & Reports
// ----------------------------------------------------------------------------

export interface DataCoverage {
  response_count?: number;
  sample_size?: number;
  eligible_count?: number;
  coverage_ratio?: number | null;
  coverage_level: CoverageLevel;
}

export interface EventOverviewAnalytics {
  event_id?: string;
  participation: {
    total_registered?: number;
    registered_count?: number;
    confirmed_attendees?: number;
    attended_count?: number;
    attendance_rate?: number | null;
    attendance_rate_reliable?: boolean;
    assessment_submissions_count?: number;
    completed_assessments?: number;
    assessment_completion_rate?: number | null;
    data_coverage?: DataCoverage;
  };
  impact_scores: {
    overall: number | null;
    immediate: number | null;
    post_event_application: number | null;
    sustained: number | null;
    participants_scored?: number;
    score_status_breakdown?: Record<string, number>;
    data_coverage?: DataCoverage;
  };
  actions_progress?: {
    total_actions?: number;
    intended_count?: number;
    in_progress_count?: number;
    completed_count?: number;
    abandoned_count?: number;
    implementation_rate?: number | null;
  };
  outcomes_summary?: {
    total_outcomes?: number;
    self_reported?: number;
    documented?: number;
    verified?: number;
  };
  follow_up_summary?: {
    total_scheduled?: number;
    total_completed?: number;
    completion_rate?: number | null;
  };
}

export interface PillarAnalyticsItem {
  pillar_id: string;
  pillar_code: string;
  pillar_name: string;
  impact_category: ImpactCategory;
  default_weight: number;
  missing_count: number;
  average: number | null;
  median: number | null;
  std_dev: number | null;
  min: number | null;
  max: number | null;
  response_count: number;
  data_coverage: DataCoverage;
}

export interface EventPillarsAnalytics {
  participants_scored: number;
  pillars: PillarAnalyticsItem[];
}

export interface EventNetworkingAnalytics {
  total_connections_reported: number;
  participants_reporting_connections: number;
  connections_per_reporting_participant: number | null;
  follow_up_conversations_count: number;
  collaborations_started_count: number;
  opportunities_discovered_count: number;
  by_connection_type: Record<string, number>;
  by_evidence_classification: Record<string, number>;
  data_coverage: DataCoverage;
}

export interface EventApplicationAnalytics {
  actions: {
    intended_only_count: number;
    in_progress_count: number;
    completed_count: number;
    abandoned_count: number;
    implementation_conversion_rate: number | null;
    by_category: Record<string, number>;
    data_coverage: DataCoverage;
  };
  outcomes: {
    by_type: Record<string, number>;
    by_evidence_classification: Record<string, number>;
    verified_outcome_ratio: number | null;
  };
}

export interface FollowUpStageAnalyticsItem {
  follow_up_stage: string;
  scheduled_count: number;
  completed_count: number;
  pending_count: number;
  overdue_count: number;
  completion_rate: number | null;
  reported_actions_count: number;
  positive_action_signal?: number | null;
  by_evidence_classification: Record<string, number>;
  data_coverage: DataCoverage;
}

export interface EventFollowUpsAnalytics {
  stages_tracked: number;
  stages: FollowUpStageAnalyticsItem[];
}

export interface ParticipantImpactSummary {
  participant_id: string;
  event_id?: string | null;
  latest_scores: ParticipantImpactScoreRead | null;
  actions_summary: {
    total?: number;
    intended?: number;
    in_progress?: number;
    completed?: number;
    abandoned?: number;
    items?: Array<Record<string, unknown>>;
  };
  connections_summary: {
    total?: number;
    follow_up_conversations?: number;
    collaborations?: number;
    opportunities?: number;
    by_type?: Record<string, number>;
  };
  outcomes_by_evidence: {
    self_reported?: number;
    documented?: number;
    verified?: number;
    items?: Array<{
      id?: string;
      outcome_type?: OutcomeType;
      description?: string;
      evidence_classification?: EvidenceClassification;
      verification_status?: VerificationStatus;
    }>;
  };
  follow_up_progress: Array<{
    follow_up_id?: string;
    follow_up_stage: string;
    status: FollowUpStatus;
    due_date?: string | null;
    completed_at?: string | null;
  }>;
}

export interface EventReportRead {
  report_type: string;
  generated_at: string;
  event: EventRead;
  overview: EventOverviewAnalytics;
  pillars: EventPillarsAnalytics;
  networking: EventNetworkingAnalytics;
  application: EventApplicationAnalytics;
  follow_ups: EventFollowUpsAnalytics;
}

export interface ParticipantReportRead {
  report_type: string;
  generated_at: string;
  participant: ParticipantRead;
  impact_summary: ParticipantImpactSummary;
  score_history: ParticipantImpactScoreRead[];
}

export interface ReportExportResult {
  report_record_id: string;
  report_type: string;
  export_format: ExportFormat;
  file_path: string;
  generated_at: string;
  report: EventReportRead | ParticipantReportRead;
}
