/**
 * Client-side i18n — entry point.
 * Each language lives in its own file under ./locales/.
 * Dynamic AI content (alerts, scheme results, meeting minutes, grievance subjects)
 * is translated via AWS Translate at runtime.
 */

import en from './locales/en'
import hi from './locales/hi'
import mr from './locales/mr'
import ta from './locales/ta'
import te from './locales/te'
import bn from './locales/bn'
import gu from './locales/gu'
import kn from './locales/kn'
import ur from './locales/ur'
import pa from './locales/pa'
import ml from './locales/ml'


const TRANSLATIONS = {
  en,
  hi,
  mr,
  ta,
  te,
  bn,
  gu,
  kn,
  ur,
  pa, 
  ml,
}

// ── Fallback chain: if a key is missing in a language, fall back to English ──
const handler = {
  get(target, key) {
    return key in target ? target[key] : TRANSLATIONS.en[key] || key
  },
}

// Create proxied dictionaries so missing keys fallback to English
Object.keys(TRANSLATIONS).forEach((lang) => {
  if (lang !== 'en') {
    TRANSLATIONS[lang] = new Proxy(TRANSLATIONS[lang], handler)
  }
})

// For languages not yet fully translated, create proxy that falls back to English entirely
const ALL_LANG_CODES = ['en', 'hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa', 'ur']
ALL_LANG_CODES.forEach((code) => {
  if (!TRANSLATIONS[code]) {
    TRANSLATIONS[code] = new Proxy({}, handler)
  }
})

export default TRANSLATIONS
