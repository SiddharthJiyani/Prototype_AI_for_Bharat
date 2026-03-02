import { Globe } from 'lucide-react'
import { useLanguage, LANGUAGES, TRANSCRIBE_LANGS, TTS_LANGS } from '@/context/LanguageContext'

/**
 * Compact language selector pill for PanchayatGPT pages.
 * Shows native script label + dropdown.
 * Optional `showCapabilities` prop shows mic/speaker icons for supported features.
 */
export default function LanguageSelector({ showCapabilities = false, className = '' }) {
  const { language, setLanguage, langMeta } = useLanguage()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="language-select" className="sr-only">Select language</label>
      <Globe size={14} className="text-muted-foreground shrink-0" />
      <select
        id="language-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native} ({l.label})
          </option>
        ))}
      </select>

      {showCapabilities && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {TRANSCRIBE_LANGS.has(language) ? (
            <span title="Voice input supported">🎤</span>
          ) : (
            <span title="Voice input not available for this language" className="opacity-40">🎤</span>
          )}
          {TTS_LANGS.has(language) ? (
            <span title="Text-to-speech supported">🔊</span>
          ) : (
            <span title="Text-to-speech not available for this language" className="opacity-40">🔊</span>
          )}
        </div>
      )}
    </div>
  )
}
