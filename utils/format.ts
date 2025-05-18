// Formats a decimal number as a percentile with the correct ordinal suffix
export function formatPercentile(decimal: number | null): string {
  // Add logging for non-null but invalid values
  if (decimal !== null && (decimal === undefined || isNaN(decimal))) {
    console.log(`[DEBUG] Invalid percentile value detected: ${decimal}`);
  }

  if (decimal === null || decimal === undefined || isNaN(decimal)) return 'N/A';
  
  const percentile = Math.round(decimal * 100);
  
  const suffixes: Record<number, string> = {
    1: 'st',
    2: 'nd',
    3: 'rd'
  };
  
  // Handle special cases for 11, 12, 13
  if (percentile % 100 >= 11 && percentile % 100 <= 13) {
    return `${percentile}th`;
  }
  
  const lastDigit = percentile % 10;
  const suffix = suffixes[lastDigit] || 'th';
  
  return `${percentile}${suffix}`;
}
