export const truncateText = (text: string, maxLength: number, moreCount: number = 0): string => {
  const moreSuffix = moreCount > 0 ? ` + ${moreCount} more` : "";
  
  if (text.length + moreSuffix.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - moreSuffix.length - 3) + "...";
};
