/**
 * Parse un montant saisi (clavier FR iOS : virgule comme décimale).
 * Accepte "12,5", "12.5", "1 234,56", "1.234,56".
 */
export function parseDecimalInput(value: string | number): number {
  if (typeof value === "number") return value;

  let s = value.trim().replace(/[\s\u00a0]/g, "");
  if (!s) return Number.NaN;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // 1.234,56
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  // Refuse 0x10, 1e3, etc. — Number() les accepterait
  if (!/^-?\d+(\.\d+)?$/.test(s)) return Number.NaN;

  return Number(s);
}
