/**
 * CCI STEM Connect Design Tokens
 * Restrained institutional analytics palette:
 * - Deep navy / slate charcoal for primary text
 * - Pure white & cool neutral slate surfaces
 * - Confident teal-blue primary action
 * - Emerald green (progress), Amber (pending), Crimson (error)
 */
export const designTokens = {
  colors: {
    brand: {
      navy: "#0F172A",
      slate: "#1E293B",
      primary: "#0E5A78",
      primaryHover: "#0B4861",
      primarySoft: "#E6F3F8",
      teal: "#0F766E",
    },
    neutral: {
      canvas: "#F8FAFC",
      surface: "#FFFFFF",
      subtle: "#F1F5F9",
      border: "#E2E8F0",
      borderStrong: "#CBD5E1",
      textPrimary: "#0F172A",
      textSecondary: "#475569",
      textMuted: "#64748B",
    },
    semantic: {
      success: "#15803D",
      successSoft: "#DCFCE7",
      warning: "#B45309",
      warningSoft: "#FEF3C7",
      danger: "#B91C1C",
      dangerSoft: "#FEE2E2",
      info: "#0369A1",
      infoSoft: "#E0F2FE",
    },
    charts: {
      pillarPalette: [
        "#0E5A78", // Professional Engagement
        "#0F766E", // Knowledge & Insights
        "#1D4ED8", // Workplace Excellence
        "#4338CA", // Recognition & Rewards
        "#0369A1", // Networking & Relationships
        "#15803D", // Post-Event Application
      ],
      grid: "#E2E8F0",
      axis: "#64748B",
    },
  },
  typography: {
    fontSans: "var(--font-inter), system-ui, -apple-system, sans-serif",
    fontDisplay: "var(--font-plus-jakarta), var(--font-inter), system-ui, sans-serif",
    fontMono: "var(--font-jetbrains), ui-monospace, monospace",
  },
  spacing: {
    pageMaxWidth: "1360px",
    participantMaxWidth: "780px",
    sidebarWidth: "260px",
    topbarHeight: "64px",
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },
  shadows: {
    card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
    elevated: "0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)",
  },
  componentSizes: {
    inputHeight: "42px",
    buttonHeightSm: "34px",
    buttonHeightMd: "40px",
    buttonHeightLg: "46px",
  },
} as const;
