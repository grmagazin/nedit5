/**
 * Hyperlink & Email detection and normalization utilities
 */

export function isLikelyUrlOrEmail(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  // Check email: user@domain.tld or mailto:user@domain.tld
  if (/^(mailto:)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(trimmed)) {
    return true;
  }
  // Check explicit protocols: http://, https://, ftp://, tel:
  if (/^(https?:\/\/|ftp:\/\/|mailto:|tel:)[^\s/$.?#].[^\s]*$/i.test(trimmed)) {
    return true;
  }
  // Check www. prefix
  if (/^www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*$/i.test(trimmed)) {
    return true;
  }
  // Common domain pattern (e.g. domain.com or domain.org/path)
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(:\d+)?(\/[^\s]*)?$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function isEmailAddress(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim().replace(/^mailto:/i, '');
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(trimmed);
}

export function normalizeUrlOrEmail(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Email format without mailto:
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  // Already prefixed with recognized protocol
  if (/^(https?:\/\/|ftp:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  // Default web addresses to https://
  return `https://${trimmed}`;
}

export interface LinkValidationResult {
  status: 'valid' | 'warning' | 'invalid';
  message: string;
}

export function validateLinkUrl(url: string): LinkValidationResult {
  const trimmed = url.trim();
  if (!trimmed) {
    return { status: 'invalid', message: 'URL field is empty' };
  }

  if (trimmed.startsWith('mailto:')) {
    const email = trimmed.replace('mailto:', '');
    if (isEmailAddress(email)) {
      return { status: 'valid', message: `Valid mailto address (${email})` };
    }
    return { status: 'invalid', message: 'Invalid email address format' };
  }

  try {
    const parsed = new URL(normalizeUrlOrEmail(trimmed));
    if (!['http:', 'https:', 'ftp:', 'mailto:'].includes(parsed.protocol)) {
      return { status: 'warning', message: `Unusual protocol: ${parsed.protocol}` };
    }
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return { status: 'warning', message: 'Hostname may be missing domain extension' };
    }
    if (parsed.protocol === 'http:') {
      return { status: 'warning', message: 'Insecure HTTP connection (HTTPS recommended)' };
    }
    return { status: 'valid', message: `Valid secure HTTPS URL (${parsed.hostname})` };
  } catch {
    return { status: 'invalid', message: 'Malformed URL syntax' };
  }
}
