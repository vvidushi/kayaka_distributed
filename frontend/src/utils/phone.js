const US_COUNTRY_CODE = '1';

const stripNonDigits = (value = '') => value.replace(/\D/g, '');

const extractNationalDigits = (value = '') => {
  const digits = stripNonDigits(value);
  if (!digits) return '';
  if (digits.startsWith(US_COUNTRY_CODE)) {
    return digits.slice(1, 11);
  }
  return digits.slice(0, 10);
};

export const formatUsPhoneInput = (value = '') => {
  const nationalDigits = extractNationalDigits(value);
  if (!nationalDigits) return '';

  const area = nationalDigits.slice(0, 3);
  const exchange = nationalDigits.slice(3, 6);
  const subscriber = nationalDigits.slice(6, 10);

  let formatted = '+1';
  if (area) formatted += ` ${area}`;
  if (exchange) formatted += ` ${exchange}`;
  if (subscriber) formatted += ` ${subscriber}`;

  return formatted.trim();
};

export const isValidUsPhone = (value = '') => extractNationalDigits(value).length === 10;

export const getE164UsPhone = (value = '') => {
  const nationalDigits = extractNationalDigits(value);
  if (nationalDigits.length !== 10) return '';
  return `+1${nationalDigits}`;
};

export const formatPhoneForDisplay = (value = '') => {
  const nationalDigits = extractNationalDigits(value);
  if (!nationalDigits) return '';
  return formatUsPhoneInput(`+1${nationalDigits}`);
};
