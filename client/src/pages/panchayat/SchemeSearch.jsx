import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Home, Leaf, Users, Download, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const SCHEMES = [
  {
    id: 1,
    name: 'Pradhan Mantri Awas Yojana',
    icon: Home,
    tag: 'Apply',
    tagVariant: 'default',
    description: 'Financial assistance for construction of pucca house for rural poor',
    funding: 'Central: 60% | State: 40%',
    budget: '₹1.20 Lakhs',
    docs: ['Aadhaar Card', 'Income Certificate', 'Bank Account Details', 'Property Documents'],
    nextSteps: 'Visit your nearest Common Service Centre or apply online at pmayg.nic.in',
  },
  {
    id: 2,
    name: 'Mahatma Gandhi NREGA',
    icon: Leaf,
    tag: 'Apply',
    tagVariant: 'default',
    description: 'Guaranteed 100 days of wage employment in a financial year',
    funding: 'Central: 100%',
    budget: 'As per state wage rate',
    docs: ['Aadhaar Card', 'Job Card Application', 'Passport Size Photograph', 'Address Proof'],
    nextSteps: 'Apply at your Gram Panchayat office or visit nrega.nic.in',
  },
  {
    id: 3,
    name: 'Jal Jeevan Mission',
    icon: Home,
    tag: 'Highly Recommended',
    tagVariant: 'secondary',
    description: 'Provides functional household tap connection to every rural household by 2024',
    funding: 'Central: 50% | State: 50%',
    budget: '₹15-20 Lakhs',
    docs: ['Village water survey', 'Prepare Village Action Plan (VAP)', 'Submit proposal to Block Development Office', 'Apply at jjm.gov.in portal'],
    nextSteps: '1. Conduct village water survey\n2. Prepare Village Action Plan (VAP)\n3. Submit proposal to Block Development Office\n4. Apply at jjm.gov.in portal',
  },
  {
    id: 4,
    name: 'MGNREGA Water Conservation',
    icon: Leaf,
    tag: 'Interested in District',
    tagVariant: 'muted',
    description: 'Employment-based water conservation and harvesting projects',
    funding: 'Central: 100%',
    budget: '₹8-12 Lakhs',
    docs: ['Work estimate', 'Gram Sabha resolution', 'Technical sanction from BDO'],
    nextSteps: 'Submit work demand through MGNREGA MIS portal',
  },
]

const MOCK_QUERY_HI = 'हमारे गाँव में पानी की समस्या है और गरीब परिवारों के लिए घर की भी जरूरत है। कौन सी योजनाएं मिल सकती हैं?'

export default function SchemeSearch() {
  const [step, setStep] = useState(0)
  const [recording, setRecording] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleRecord = () => {
    if (!recording) {
      setRecording(true)
      setTimeout(() => {
        setRecording(false)
        setQuery(MOCK_QUERY_HI)
        setStep(1)
      }, 3000)
    } else {
      setRecording(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/panchayat')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Scheme Navigator</h1>
        <p className="text-sm text-muted-foreground">Ask about schemes in your language — voice or text</p>
      </div>

      {/* Query input */}
      <Card>
        <CardContent className="py-5 space-y-4">
          {query ? (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Mic size={13} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Your Question:</p>
                <p className="text-sm leading-relaxed font-devanagari">{query}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <button
                onClick={handleRecord}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                  recording
                    ? 'bg-destructive text-destructive-foreground animate-pulse'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {recording ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              <p className="text-xs text-muted-foreground">
                {recording ? 'Recording…' : 'Tap to ask about schemes'}
              </p>
            </div>
          )}

          {!query && (
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Or type your question about schemes…"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={() => query && setStep(1)} disabled={!query}>Search</Button>
            </div>
          )}

          {query && step === 0 && (
            <Button className="w-full" onClick={() => setStep(1)}>Find Matching Schemes</Button>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">AI Recommendations</h2>
            <span className="text-xs text-muted-foreground">{SCHEMES.length} schemes found</span>
          </div>

          {SCHEMES.map((scheme) => {
            const Icon = scheme.icon
            return (
              <Card key={scheme.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={15} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{scheme.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{scheme.description}</p>
                      </div>
                    </div>
                    <Badge variant={scheme.tagVariant} className="shrink-0">{scheme.tag}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Funding Source</p>
                      <p className="font-medium mt-0.5">{scheme.funding}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estimated Budget</p>
                      <p className="font-medium mt-0.5">{scheme.budget}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Required Documents:</p>
                    <ul className="space-y-0.5">
                      {scheme.docs.map(doc => (
                        <li key={doc} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Next Steps:</p>
                    <p className="text-xs">{scheme.nextSteps}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="gap-2">
              <Download size={14} /> Download Report
            </Button>
            <Button className="gap-2">
              <Send size={14} /> Start Application Process
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
