import { Language } from '../types';

/**
 * Formats numbers into localized strings.
 * If language is 'ar', it returns Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩).
 */
export const formatNumber = (
  num: number | string, 
  lang: Language, 
  options: Intl.NumberFormatOptions = {}
): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';

  const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
  
  // Set default precision for currency-like numbers if not specified
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    ...options
  };

  return new Intl.NumberFormat(locale, defaultOptions).format(value);
};

/**
 * Specifically formats currency values using the app's CURRENCY constant.
 */
export const formatCurrency = (
  amount: number, 
  lang: Language, 
  currencySymbol: string
): string => {
  const formattedValue = formatNumber(amount, lang, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  return lang === 'ar' 
    ? `${formattedValue} ${currencySymbol}` // Symbol often follows in Arabic contexts
    : `${currencySymbol}${formattedValue}`;
};
