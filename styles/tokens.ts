/**
 * CCI STEM Connect Design Tokens
 * @author JoJeGa
 * Branded around CCI Crimson (#D41B23), Obsidian Charcoal (#111827), and Crisp Neutral Surfaces.
 */
export const BRAND_TRADEMARK = "JoJeGa" as const;

export const designTokens = {
  meta: {
    mark: BRAND_TRADEMARK,
    system: "CCI STEM Connect UI",
  },
  colors: {
    brand: {
      navy: "#111827",
      slate: "#1F2937",
      primary: "#D41B23",
      primaryHover: "#B5151C",
      primaryDeep: "#8E1117",
      primarySoft: "#FDF2F2",
      teal: "#1E293B",
    },
    neutral: {
      canvas: "#F9FAFB",
      surface: "#FFFFFF",
      subtle: "#F3F4F6",
      border: "#E5E7EB",
      borderStrong: "#D1D5DB",
      textPrimary: "#111827",
      textSecondary: "#4B5563",
      textMuted: "#6B7280",
    },
    semantic: {
      success: "#15803D",
      successSoft: "#DCFCE7",
      warning: "#B45309",
      warningSoft: "#FEF3C7",
      danger: "#991B1B",
      dangerSoft: "#FEE2E2",
      info: "#1E293B",
      infoSoft: "#F1F5F9",
    },
    charts: {
      pillarPalette: [
        "#D41B23", // Professional Engagement (CCI Crimson)
        "#1E293B", // Knowledge & Insights (Obsidian Slate)
        "#9F1239", // Workplace Excellence (Deep Rose)
        "#B45309", // Recognition & Rewards (Warm Amber)
        "#475569", // Networking & Relationships (Cool Graphite)
        "#15803D", // Post-Event Application (Growth Emerald)
      ],
      grid: "#E5E7EB",
      axis: "#6B7280",
    },
  },
  typography: {
    fontSans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontDisplay: "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
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
    card: "0 1px 2px 0 rgba(17, 24, 39, 0.04), 0 1px 3px 0 rgba(17, 24, 39, 0.06)",
    elevated: "0 4px 16px -2px rgba(17, 24, 39, 0.08), 0 2px 6px -2px rgba(17, 24, 39, 0.04)",
  },
  componentSizes: {
    inputHeight: "42px",
    buttonHeightSm: "34px",
    buttonHeightMd: "40px",
    buttonHeightLg: "46px",
  },
} as const;
