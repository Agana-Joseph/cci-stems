import { describe, expect, it } from "vitest";
import { extractOverviewMetrics } from "@/lib/utils/overview-metrics";
import type { EventOverviewAnalytics } from "@/types/api";

describe("extractOverviewMetrics", () => {
  it("maps exact analytics/service.py overview fields", () => {
    const payload: EventOverviewAnalytics = {
      event_id: "evt-1",
      participation: {
        total_registered_participants: 42,
        total_confirmed_attendees: 36,
        attendance_rate: 0.857,
        assessment_respondents_count: 30,
        assessment_completion_rate: 1.0,
        assessment_data_coverage: {
          response_count: 30,
          eligible_count: 30,
          coverage_ratio: 1.0,
          coverage_level: "high",
        },
      },
      impact_scores: {
        overall_event_impact: {
          average: 84.5,
          response_count: 28,
          data_coverage: {
            response_count: 28,
            coverage_level: "high",
          },
        },
        immediate_impact: { average: 86.2, response_count: 28 },
        post_event_application: { average: 79.4, response_count: 15 },
        sustained_impact: { average: null, response_count: 0 },
      },
      follow_up_summary: {
        total_scheduled: 30,
        total_completed: 12,
        completion_rate: 0.4,
      },
    };

    const m = extractOverviewMetrics(payload);
    expect(m.totalRegistered).toBe(42);
    expect(m.confirmedAttendees).toBe(36);
    expect(m.attendanceRate).toBe(0.857);
    expect(m.completedAssessments).toBe(30);
    expect(m.assessmentCompletionRate).toBe(1.0);
    expect(m.pendingAssessments).toBe(12);
    expect(m.assessmentCoverageCount).toBe(30);
    expect(m.assessmentCoverage?.coverage_level).toBe("high");
    expect(m.followUpsCompleted).toBe(12);
    expect(m.followUpsScheduled).toBe(30);
    expect(m.overallImpact).toEqual({
      average: 84.5,
      responseCount: 28,
      coverageLevel: "high",
    });
    expect(m.immediateImpact.average).toBe(86.2);
    expect(m.applicationImpact.average).toBe(79.4);
    expect(m.sustainedImpact.average).toBeNull();
  });

  it("still supports legacy flat field fallbacks", () => {
    const legacy: EventOverviewAnalytics = {
      participation: {
        total_registered: 10,
        confirmed_attendees: 8,
        attendance_rate: 0.8,
        completed_assessments: 6,
        assessment_completion_rate: 0.75,
        data_coverage: { response_count: 6, coverage_level: "moderate" },
      },
      impact_scores: {
        overall: 78.1,
        immediate: 80,
        post_event_application: 74,
        sustained: null,
        participants_scored: 6,
        data_coverage: { response_count: 6, coverage_level: "moderate" },
      },
    };

    const m = extractOverviewMetrics(legacy);
    expect(m.totalRegistered).toBe(10);
    expect(m.confirmedAttendees).toBe(8);
    expect(m.completedAssessments).toBe(6);
    expect(m.pendingAssessments).toBe(4);
    expect(m.overallImpact).toEqual({
      average: 78.1,
      responseCount: 6,
      coverageLevel: "moderate",
    });
  });
});
