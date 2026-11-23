/**
 * Money is stored and computed as integer **cents** to avoid floating-point
 * rounding errors (0.1 + 0.2 !== 0.3). Conversion to and from decimal strings
 * happens only at the edges (forms, CSV import, display).
 */

const DECIMAL_AMOUNT = /^(-)?(\d+)(?:[.,](\d{1,2}))?$/;

/** Parse a decimal string such as "12.5", "-3,40" or "100" into cents. */
export function toCents(amount: string): number {
  const match = DECIMAL_AMOUNT.exec(amount.trim());
  if (!match) {
    throw new Error(`Invalid amount: "${amount}"`);
  }
  const [, sign, units = "0", fraction = ""] = match;
  const cents = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Amount out of range: "${amount}"`);
  }
  return sign ? -cents : cents;
}

/** Format cents as a localized currency string, e.g. 123456 → "R$ 1.234,56". */
export function formatCents(cents: number, currency = "BRL", locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
