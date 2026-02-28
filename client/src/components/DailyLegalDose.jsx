import { useState, useEffect } from 'react'
import { Lightbulb, RefreshCw, Volume2, ChevronRight } from 'lucide-react'
import axios from 'axios'

const STATIC_TIPS = [
  {
    title: 'Free Legal Aid Is Your Right',
    titleHi: 'मुफ्त कानूनी सहायता आपका अधिकार है',
    content: 'Under the Legal Services Authorities Act, SC/ST members, women, children, disabled persons, and those earning below ₹3 lakh/year can get FREE legal aid. Call 15100.',
    contentHi: 'कानूनी सेवा प्राधिकरण अधिनियम के तहत, SC/ST, महिलाएं, बच्चे, विकलांग और ₹3 लाख/वर्ष से कम आय वालों को मुफ्त कानूनी सहायता मिल सकती है। 15100 पर कॉल करें।',
    category: 'Legal Aid',
    law: 'Legal Services Authorities Act 1987',
  },
  {
    title: 'MGNREGA: 100 Days Guaranteed Work',
    titleHi: 'मनरेगा: 100 दिन का काम गारंटी',
    content: 'Every rural household is entitled to 100 days of wage employment per year under MGNREGA. If work is not provided within 15 days of applying, you are entitled to unemployment allowance.',
    contentHi: 'मनरेगा के तहत हर ग्रामीण परिवार को 100 दिन का रोजगार मिलना चाहिए। आवेदन के 15 दिन में काम नहीं मिलने पर बेरोजगारी भत्ता मिलेगा।',
    category: 'MGNREGA',
    law: 'MGNREGA Act 2005, Section 3',
  },
  {
    title: 'RTI: Your Right to Know',
    titleHi: 'RTI: जानने का अधिकार',
    content: 'You can file an RTI for just ₹10 to get information from any government office. They must reply within 30 days. BPL families are exempt from the fee.',
    contentHi: 'सिर्फ ₹10 में RTI फाइल करके किसी भी सरकारी कार्यालय से जानकारी ले सकते हैं। 30 दिन में जवाब मिलना ज़रूरी है। BPL परिवारों को शुल्क नहीं देना होता।',
    category: 'RTI',
    law: 'Right to Information Act 2005',
  },
  {
    title: 'Consumer Protection: No Lawyer Needed',
    titleHi: 'उपभोक्ता संरक्षण: वकील की ज़रूरत नहीं',
    content: 'You can file a consumer complaint yourself — no lawyer needed. Consumer Forum charges minimal fee (₹100-₹5000). File within 2 years of the issue.',
    contentHi: 'उपभोक्ता शिकायत खुद दर्ज कर सकते हैं — वकील की ज़रूरत नहीं। फोरम शुल्क ₹100-₹5000 है। समस्या के 2 साल के भीतर शिकायत करें।',
    category: 'Consumer Rights',
    law: 'Consumer Protection Act 2019',
  },
  {
    title: 'Equal Property Rights for Daughters',
    titleHi: 'बेटियों को बराबर संपत्ति का अधिकार',
    content: 'Since 2005, daughters have equal rights as sons in ancestral property. This applies to Hindu, Sikh, Jain and Buddhist families. A married daughter keeps her right to parental property.',
    contentHi: '2005 से बेटियों को पैतृक संपत्ति में बेटों के बराबर अधिकार है। यह हिंदू, सिख, जैन और बौद्ध परिवारों पर लागू होता है। शादी के बाद भी यह अधिकार बना रहता है।',
    category: 'Property Rights',
    law: 'Hindu Succession Amendment Act 2005',
  },
  {
    title: 'Domestic Violence: Call 181',
    titleHi: 'घरेलू हिंसा: 181 पर कॉल करें',
    content: 'Domestic violence includes physical, verbal, emotional & economic abuse. Women can get immediate protection orders. Call Women Helpline 181 (24x7) or Police 112.',
    contentHi: 'घरेलू हिंसा में शारीरिक, मौखिक, भावनात्मक और आर्थिक शोषण शामिल है। महिलाएं तुरंत सुरक्षा आदेश पा सकती हैं। महिला हेल्पलाइन 181 या पुलिस 112 पर कॉल करें।',
    category: 'Women Rights',
    law: 'DV Act 2005',
  },
  {
    title: 'E-Shram Card: ₹2 Lakh Insurance',
    titleHi: 'E-Shram कार्ड: ₹2 लाख बीमा',
    content: 'Unorganized workers (laborers, street vendors, domestic workers etc.) can register at eshram.gov.in for free. You get ₹2 lakh accidental insurance cover.',
    contentHi: 'असंगठित मज़दूर (मज़दूर, ठेलेवाले, घरेलू कामगार) eshram.gov.in पर मुफ्त पंजीकरण कर सकते हैं। ₹2 लाख का दुर्घटना बीमा मिलता है।',
    category: 'Labour Rights',
    law: 'Unorganized Workers Social Security Act 2008',
  },
]

export default function DailyLegalDose({ language = 'hi' }) {
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    // Random tip on mount
    setTipIndex(Math.floor(Math.random() * STATIC_TIPS.length))
  }, [])

  const tip = STATIC_TIPS[tipIndex]
  const isHindi = language === 'hi'
  const nextTip = () => setTipIndex((prev) => (prev + 1) % STATIC_TIPS.length)

  return (
    <div className="border border-border rounded-xl bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-saffron-100 dark:bg-saffron-900/30 flex items-center justify-center">
            <Lightbulb size={14} className="text-saffron-600 dark:text-saffron-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isHindi ? 'आज का कानूनी ज्ञान' : 'Daily Legal Dose'}
          </span>
        </div>
        <button
          onClick={nextTip}
          className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Next tip"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold leading-snug">
          {isHindi ? tip.titleHi : tip.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {isHindi ? tip.contentHi : tip.content}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-primary font-medium">{tip.law}</span>
        <span className="text-[10px] text-muted-foreground">{tipIndex + 1}/{STATIC_TIPS.length}</span>
      </div>
    </div>
  )
}
