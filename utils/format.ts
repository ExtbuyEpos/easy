import { Language } from '../types';

/**
 * Formats numbers into localized strings.
 * If language is 'ar', it returns Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) 
 * by using the 'u-nu-arab' extension.
 */
export const formatNumber = (
  num: number | string, 
  lang: Language, 
  options: Intl.NumberFormatOptions = {}
): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';

  // Use the 'u-nu-arab' extension to force Eastern Arabic numerals
  const locale = lang === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US';
  
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
  
  // In Arabic, the currency symbol typically follows the number
  return lang === 'ar' 
    ? `${formattedValue} ${currencySymbol}`
    : `${currencySymbol}${formattedValue}`;
};