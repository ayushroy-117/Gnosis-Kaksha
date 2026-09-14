// Shared display formatters used across all portals.

/** Formats a number as Indian Rupees, e.g. 2950 -> "₹2,950". */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Formats an ISO date string as e.g. "10 Sep 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
