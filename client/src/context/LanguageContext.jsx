import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'
import TRANSLATIONS from '@/i18n/translations'

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

/* ── Supported language list (matches ai-service LANG_MAP) ── */
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
]

/* ── Capability maps ── */
export const TRANSCRIBE_LANGS = new Set(['hi', 'en', 'ta', 'te', 'mr'])
export const TTS_LANGS = new Set(['hi', 'en'])

/* ── Context ── */
const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageRaw] = useState(
    () => localStorage.getItem('panchayatLang') || 'hi',
  )

  const setLanguage = useCallback((code) => {
    localStorage.setItem('panchayatLang', code)
    setLanguageRaw(code)
  }, [])

  /** Translate a single text string to the current language (no-op if already target lang or English source). */
  const translateText = useCallback(
    async (text, { from = 'en', to } = {}) => {
      const target = to || language
      if (!text || target === from) return text
      try {
        const res = await axios.post(`${AI_BASE}/ai/translate/translate`, {
          text,
          source_lang: from,
          target_lang: target,
        }, { timeout: 15000 })
        return res.data.translated_text || text
      } catch {
        return text // graceful fallback
      }
    },
    [language],
  )

  /** Translate an array of strings in one batch (parallel). */
  const translateBatch = useCallback(
    async (texts, { from = 'en', to } = {}) => {
      const target = to || language
      if (target === from) return texts
      const results = await Promise.all(
        texts.map((t) =>
          t
            ? translateText(t, { from, to: target })
            : Promise.resolve(t),
        ),
      )
      return results
    },
    [language, translateText],
  )

  /** Get the best transcription language code (falls back to hi). */
  const getTranscribeLang = useCallback(
    () => (TRANSCRIBE_LANGS.has(language) ? language : 'hi'),
    [language],
  )

  /** Get the best TTS language code (falls back to hi). */
  const getTtsLang = useCallback(
    () => (TTS_LANGS.has(language) ? language : 'hi'),
    [language],
  )

  const langMeta = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  /** Instant i18n lookup for static UI labels — no API call needed. */
  const t = useCallback(
    (key) => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.en
      return dict[key] || TRANSLATIONS.en[key] || key
    },
    [language],
  )

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        langMeta,
        t,
        translateText,
        translateBatch,
        getTranscribeLang,
        getTtsLang,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
