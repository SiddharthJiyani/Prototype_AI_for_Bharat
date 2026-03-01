import { Link } from 'react-router-dom'

const footerLinks = {
  'For Citizens': [
    { label: 'Legal Help', href: '/nyaymitra/file' },
    { label: 'Schemes', href: '/nyaymitra' },
    { label: 'Your Cases', href: '/nyaymitra/cases' },
  ],
  'For Panchayats': [
    { label: 'Dashboard', href: '/panchayat' },
    { label: 'Scheme Navigator', href: '/panchayat/schemes' },
    { label: 'Grievances', href: '/panchayat/grievances' },
  ],
  Support: [
    { label: 'Help Center', href: '#' },
    { label: 'Contact Us', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary">
                <span className="text-primary-foreground text-xs font-bold">IG</span>
              </div>
              <span className="font-semibold text-sm">IntegratedGov AI</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Empowering citizens and Panchayats through AI-driven governance solutions. Built for Bharat.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 IntegratedGov AI - Built for Bharat
          </p>
          <p className="text-xs text-muted-foreground">
            AI for Bharat Hackathon · Team Gryffindor_
          </p>
        </div>
      </div>
    </footer>
  )
}
