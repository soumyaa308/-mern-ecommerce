/**
 * Formats a number as Indian Rupees with proper Indian-style comma
 * grouping (e.g. 1,49,999 instead of 149,999).
 */
export const formatINR = (amount) => {
  if (amount === null || amount === undefined) return "";
  return `\u20b9${Number(amount).toLocaleString("en-IN")}`;
};