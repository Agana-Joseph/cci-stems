import type {
  CoverageLevel,
  DataCoverage,
  EventOverviewAnalytics,
  ImpactScoreStat,
} from "@/types/api";

export interface ResolvedImpactMetric {
  average: number | null;
  responseCount?: number;
  coverageLevel?: CoverageLevel;
}

export interface ResolvedOverviewMetrics {
  totalRegistered: number;
  confirmedAttendees: number;
  attendanceRate: number | null;
  completedAssessments: number;
  assessmentCompletionRate: number | null;
  pendingAssessments: number;
  attendanceCoverage?: DataCoverage;
  assessmentCoverage?: DataCoverage;
  assessmentCoverageCount: number;
  followUpsCompleted: number;
  followUpsScheduled: number;
  followUpsCompletionRate: number | null;
  overallImpact: ResolvedImpactMetric;
  immediateImpact: ResolvedImpactMetric;
  applicationImpact: ResolvedImpactMetric;
  sustainedImpact: ResolvedImpactMetric;
}

function unwrapScoreStat(
  primary: ImpactScoreStat | number | null | undefined,
  fallback?: ImpactScoreStat | number | null | undefined,
  fallbackParticipantsScored?: number,
  fallbackCoverage?: DataCoverage
): ResolvedImpactMetric {
  const source = primary !== undefined ? primary : fallback;

  if (typeof source === "number") {
    return {
      average: Number.isNaN(source) ? null : source,
      responseCount: fallbackParticipantsScored ?? fallbackCoverage?.response_count,
      coverageLevel: fallbackCoverage?.coverage_level,
    };
  }

  if (source && typeof source === "object") {
    const avg =
      typeof source.average === "number" && !Number.isNaN(source.average)
        ? source.average
        : null;
    const count =
      typeof source.response_count === "number"
        ? source.response_count
        : (source.data_coverage?.response_count ??
          fallbackParticipantsScored ??
          fallbackCoverage?.response_count);
    const coverageLevel =
      source.data_coverage?.coverage_level ?? fallbackCoverage?.coverage_level;
    return {
      average: avg,
      responseCount: count,
      coverageLevel,
    };
  }

  return {
    average: null,
    responseCount: fallbackParticipantsScored ?? fallbackCoverage?.response_count,
    coverageLevel: fallbackCoverage?.coverage_level,
  };
}

export function extractOverviewMetrics(
  overview?: EventOverviewAnalytics | null
): ResolvedOverviewMetrics {
  const part = overview?.participation;
  const scores = overview?.impact_scores;
  const fu = overview?.follow_up_summary;

  const totalRegistered =
    part?.total_registered_participants ??
    part?.total_registered ??
    part?.registered_count ??
    0;

  const confirmedAttendees =
    part?.total_confirmed_attendees ??
    part?.confirmed_attendees ??
    part?.attended_count ??
    0;

  const completedAssessments =
    part?.assessment_respondents_count ??
    part?.completed_assessments ??
    part?.assessment_submissions_count ??
    0;

  const pendingAssessments = Math.max(0, totalRegistered - completedAssessments);

  const assessmentCoverage = part?.assessment_data_coverage ?? part?.data_coverage;
  const attendanceCoverage = part?.attendance_data_coverage ?? part?.data_coverage;
  const assessmentCoverageCount =
    assessmentCoverage?.response_count ?? completedAssessments;

  const overallImpact = unwrapScoreStat(
    scores?.overall_event_impact,
    scores?.overall,
    scores?.participants_scored,
    scores?.data_coverage
  );

  const immediateImpact = unwrapScoreStat(
    scores?.immediate_impact,
    scores?.immediate
  );

  const applicationImpact = unwrapScoreStat(scores?.post_event_application);

  const sustainedImpact = unwrapScoreStat(
    scores?.sustained_impact,
    scores?.sustained
  );

  return {
    totalRegistered,
    confirmedAttendees,
    attendanceRate: part?.attendance_rate ?? null,
    completedAssessments,
    assessmentCompletionRate: part?.assessment_completion_rate ?? null,
    pendingAssessments,
    attendanceCoverage,
    assessmentCoverage,
    assessmentCoverageCount,
    followUpsCompleted: fu?.total_completed ?? 0,
    followUpsScheduled: fu?.total_scheduled ?? 0,
    followUpsCompletionRate: fu?.completion_rate ?? null,
    overallImpact,
    immediateImpact,
    applicationImpact,
    sustainedImpact,
  };
}
