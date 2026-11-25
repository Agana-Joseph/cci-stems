export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatScore(value?: number | null, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Insufficient data";
  }
  return value.toFixed(digits);
}

export function formatPercent(value?: number | null, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  // Backend may return 0..1 ratio or 0..100 percentage; normalize safely
  const pct = value > 0 && value <= 1 ? value * 100 : value;
  return `${pct.toFixed(digits)}%`;
}

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return "••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-3)}`;
}

export function maskEmail(email?: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!local || !domain) return "••••";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}•••@${domain}`;
}

export function formatStageLabel(stageCode: string): string {
  const map: Record<string, string> = {
    "30_day": "30-Day Follow-Up",
    "60_day": "60-Day Follow-Up",
    "90_day": "90-Day Follow-Up",
  };
  return (
    map[stageCode] ??
    stageCode
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatEnumLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerBlobDownload(blob, filename);
}

export function downloadCsvRows(rows: Array<Record<string, unknown>>, filename: string): void {
  if (rows.length === 0) return;
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const escapeCell = (val: unknown) => {
    const str = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
