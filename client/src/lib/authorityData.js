/**
 * DEMO AUTHORITY DATABASE
 * ──────────────────────────────────────────────────────────────────────────
 * Maps complaint categories to responsible government authorities with
 * placeholder email addresses for prototype demonstration purposes.
 *
 * ⚠️  DEMO DATA: All email addresses shown below are illustrative placeholders.
 *     In production, replace with actual verified official email addresses
 *     sourced from:
 *       • rtionline.gov.in  (Central PIO directory — 2,000+ verified emails)
 *       • pgportal.gov.in   (State grievance officers)
 *       • State govt portals (e.g., mcgm.gov.in, bbmp.gov.in, amc.gov.in)
 *       • goidirectory.nic.in (NIC govt employee directory)
 * ──────────────────────────────────────────────────────────────────────────
 */

/**
 * Scope classification for each category.
 * Used as an optimistic pre-fill hint while the AI endpoint resolves recipients.
 *   "government" — complaint is always against a public authority
 *   "mixed"      — may involve both a private party and an authority (AI decides)
 *   "private"    — default assumption is a dispute between two private parties
 */
export const CATEGORY_SCOPES = {
  'Public Nuisance / Municipal Complaint':    'government',
  'MGNREGA Wage Dispute':                     'government',
  'RTI Application':                          'government',
  'Police Misconduct / Accountability':       'government',
  'Environmental Rights':                     'government',
  'Disability Rights':                        'government',
  'Education Rights':                         'government',
  'Government Scheme Denial':                 'government',
  'Free Legal Aid Request':                   'government',
  'Criminal Rights / Arrest':                 'government',
  'Consumer Complaint':                       'mixed',
  'Labour Rights':                            'mixed',
  'Land Dispute':                             'mixed',
  'Property Dispute':                         'mixed',
  'Domestic Violence':                        'mixed',
  'Caste Discrimination / SC-ST Atrocity':    'mixed',
  'Child Rights':                             'mixed',
  'Healthcare Rights':                        'mixed',
  'Senior Citizen Rights':                    'mixed',
  'Cyber Crime':                              'mixed',
  'Other':                                    'mixed',
}

/** Authorities keyed by the exact category string returned by the AI categorizer */
export const AUTHORITY_MAP = {

  // ── Public Nuisance / Municipal Complaints ─────────────────────────────
  'Public Nuisance / Municipal Complaint': [
    { label: 'Municipal Commissioner (AMC)',    email: 'commissioner.amc@demo.nyaymitra.example',          dept: 'Municipal Corporation' },
    { label: 'Ward Officer / Zone Inspector',   email: 'ward.officer.amc@demo.nyaymitra.example',          dept: 'Municipal Corporation' },
    { label: 'Local Police Station (SHO)',      email: 'sho.localstation@demo.nyaymitra.example',          dept: 'Police' },
  ],

  // ── MGNREGA Wage Dispute ───────────────────────────────────────────────
  'MGNREGA Wage Dispute': [
    { label: 'Block Development Officer (BDO)', email: 'bdo.district@demo.nyaymitra.example',              dept: 'Rural Development' },
    { label: 'Programme Officer – MGNREGA',     email: 'po.mgnrega@demo.nyaymitra.example',                dept: 'Rural Development' },
    { label: 'District Collector',              email: 'collector.district@demo.nyaymitra.example',        dept: 'District Administration' },
  ],

  // ── RTI Application ────────────────────────────────────────────────────
  'RTI Application': [
    { label: 'Public Information Officer (PIO)', email: 'pio.department@demo.nyaymitra.example',           dept: 'Relevant Dept / Ministry' },
    { label: 'Appellate Authority',              email: 'appellate.authority@demo.nyaymitra.example',      dept: 'Relevant Dept / Ministry' },
    { label: 'Central Information Commission',   email: 'cic.nodal@demo.nyaymitra.example',                dept: 'CIC' },
  ],

  // ── Consumer Complaint ─────────────────────────────────────────────────
  'Consumer Complaint': [
    { label: 'District Consumer Forum',          email: 'consumer.forum.district@demo.nyaymitra.example',  dept: 'Consumer Affairs' },
    { label: 'State Consumer Commission',        email: 'consumer.statecommission@demo.nyaymitra.example', dept: 'Consumer Affairs' },
    { label: 'National Consumer Helpline',       email: 'nchf.nodal@demo.nyaymitra.example',               dept: 'Dept of Consumer Affairs' },
  ],

  // ── Land Dispute ───────────────────────────────────────────────────────
  'Land Dispute': [
    { label: 'District Collector / DM',          email: 'collector.district@demo.nyaymitra.example',       dept: 'Revenue Department' },
    { label: 'Sub-Divisional Magistrate (SDM)',  email: 'sdm.subdivision@demo.nyaymitra.example',          dept: 'Revenue Department' },
    { label: 'State Revenue Board',              email: 'revenue.board.state@demo.nyaymitra.example',      dept: 'Revenue Department' },
  ],

  // ── Domestic Violence ──────────────────────────────────────────────────
  'Domestic Violence': [
    { label: 'Protection Officer (PWDVA)',        email: 'protection.officer.pwdva@demo.nyaymitra.example', dept: 'Women & Child Development' },
    { label: 'Local Police Station (SHO)',        email: 'sho.localstation@demo.nyaymitra.example',         dept: 'Police' },
    { label: 'National Commission for Women',     email: 'ncw.nodal@demo.nyaymitra.example',                dept: 'NCW' },
    { label: 'One Stop Centre (Sakhi)',           email: 'osc.sakhi.district@demo.nyaymitra.example',       dept: 'Women & Child Development' },
  ],

  // ── Labour Rights ──────────────────────────────────────────────────────
  'Labour Rights': [
    { label: 'Labour Commissioner (State)',       email: 'labour.commissioner.state@demo.nyaymitra.example', dept: 'Labour Department' },
    { label: 'Labour Inspector (District)',       email: 'labour.inspector.district@demo.nyaymitra.example', dept: 'Labour Department' },
    { label: 'Central Labour Commissioner',       email: 'clc.central@demo.nyaymitra.example',               dept: 'Ministry of Labour' },
  ],

  // ── Property Dispute ───────────────────────────────────────────────────
  'Property Dispute': [
    { label: 'Sub-Registrar Office',             email: 'subregistrar.district@demo.nyaymitra.example',    dept: 'Registration Dept' },
    { label: 'District Collector',               email: 'collector.district@demo.nyaymitra.example',       dept: 'Revenue Department' },
    { label: 'Municipal Corporation (Property)', email: 'property.tax.municipal@demo.nyaymitra.example',   dept: 'Municipal Corporation' },
  ],

  // ── Criminal Rights / Arrest ───────────────────────────────────────────
  'Criminal Rights / Arrest': [
    { label: 'Superintendent of Police (SP)',    email: 'sp.district@demo.nyaymitra.example',              dept: 'Police' },
    { label: 'National Human Rights Commission', email: 'nhrc.complaints@demo.nyaymitra.example',          dept: 'NHRC' },
    { label: 'State Human Rights Commission',    email: 'shrc.state@demo.nyaymitra.example',               dept: 'SHRC' },
  ],

  // ── Education Rights ───────────────────────────────────────────────────
  'Education Rights': [
    { label: 'District Education Officer (DEO)', email: 'deo.district@demo.nyaymitra.example',             dept: 'Education Dept' },
    { label: 'Block Education Officer (BEO)',    email: 'beo.block@demo.nyaymitra.example',                 dept: 'Education Dept' },
    { label: 'National Commission for Protection of Child Rights', email: 'ncpcr.nodal@demo.nyaymitra.example', dept: 'NCPCR' },
  ],

  // ── Disability Rights ──────────────────────────────────────────────────
  'Disability Rights': [
    { label: 'District Disability Officer',      email: 'disability.officer.district@demo.nyaymitra.example', dept: 'Social Justice' },
    { label: 'Chief Commissioner for Persons with Disabilities', email: 'ccpd.nodal@demo.nyaymitra.example',  dept: 'Dept of Empowerment of PwD' },
  ],

  // ── Cyber Crime ────────────────────────────────────────────────────────
  'Cyber Crime': [
    { label: 'Cyber Crime Cell (Local Police)',  email: 'cybercell.local.police@demo.nyaymitra.example',   dept: 'Police – Cyber Cell' },
    { label: 'National Cyber Crime Portal',      email: 'cybercrime.helpdesk.national@demo.nyaymitra.example', dept: 'MHA Cyber Crime' },
    { label: 'Superintendent of Police (SP)',    email: 'sp.district@demo.nyaymitra.example',              dept: 'Police' },
  ],

  // ── Child Rights ───────────────────────────────────────────────────────
  'Child Rights': [
    { label: 'Child Welfare Committee (CWC)',    email: 'cwc.district@demo.nyaymitra.example',             dept: 'Women & Child Development' },
    { label: 'District Child Protection Unit',   email: 'dcpu.district@demo.nyaymitra.example',            dept: 'Women & Child Development' },
    { label: 'NCPCR',                            email: 'ncpcr.nodal@demo.nyaymitra.example',               dept: 'NCPCR' },
  ],

  // ── Healthcare Rights ──────────────────────────────────────────────────
  'Healthcare Rights': [
    { label: 'Chief Medical Officer (CMO)',       email: 'cmo.district@demo.nyaymitra.example',             dept: 'Health Department' },
    { label: 'State Medical Council',            email: 'smc.state@demo.nyaymitra.example',                 dept: 'Health Department' },
    { label: 'National Human Rights Commission', email: 'nhrc.complaints@demo.nyaymitra.example',           dept: 'NHRC' },
  ],

  // ── Environmental Rights ───────────────────────────────────────────────
  'Environmental Rights': [
    { label: 'State Pollution Control Board',    email: 'spcb.state@demo.nyaymitra.example',               dept: 'Environment Dept' },
    { label: 'District Magistrate (DM)',         email: 'dm.district@demo.nyaymitra.example',              dept: 'District Administration' },
    { label: 'National Green Tribunal (NGT)',    email: 'ngt.nodal@demo.nyaymitra.example',                 dept: 'NGT' },
    { label: 'Municipal Corporation (Sanitation)', email: 'sanitation.municipal@demo.nyaymitra.example',   dept: 'Municipal Corporation' },
  ],

  // ── Police Misconduct / Accountability ────────────────────────────────
  'Police Misconduct / Accountability': [
    { label: 'Superintendent of Police (SP)',    email: 'sp.district@demo.nyaymitra.example',              dept: 'Police' },
    { label: 'Director General of Police (DGP)', email: 'dgp.state@demo.nyaymitra.example',               dept: 'Police HQ' },
    { label: 'National Human Rights Commission', email: 'nhrc.complaints@demo.nyaymitra.example',          dept: 'NHRC' },
    { label: 'State Human Rights Commission',    email: 'shrc.state@demo.nyaymitra.example',               dept: 'SHRC' },
  ],

  // ── Caste Discrimination / SC-ST Atrocity ─────────────────────────────
  'Caste Discrimination / SC-ST Atrocity': [
    { label: 'Superintendent of Police (SP)',    email: 'sp.district@demo.nyaymitra.example',              dept: 'Police' },
    { label: 'District Collector (Nodal Officer)', email: 'collector.district@demo.nyaymitra.example',    dept: 'District Administration' },
    { label: 'National Commission for SC',       email: 'ncsc.nodal@demo.nyaymitra.example',               dept: 'NCSC' },
    { label: 'National Commission for ST',       email: 'ncst.nodal@demo.nyaymitra.example',               dept: 'NCST' },
  ],

  // ── Senior Citizen Rights ─────────────────────────────────────────────
  'Senior Citizen Rights': [
    { label: 'District Social Welfare Officer',  email: 'dswo.district@demo.nyaymitra.example',            dept: 'Social Welfare Dept' },
    { label: 'Sub-Divisional Magistrate (SDM)',  email: 'sdm.subdivision@demo.nyaymitra.example',          dept: 'District Administration' },
    { label: 'Maintenance Tribunal (Nodal)',     email: 'maintenance.tribunal.district@demo.nyaymitra.example', dept: 'District Administration' },
  ],

  // ── Government Scheme Denial ───────────────────────────────────────────
  'Government Scheme Denial': [
    { label: 'Block Development Officer (BDO)',  email: 'bdo.district@demo.nyaymitra.example',             dept: 'Rural Development' },
    { label: 'District Collector',               email: 'collector.district@demo.nyaymitra.example',       dept: 'District Administration' },
    { label: 'CPGRAMS Nodal Officer',            email: 'cpgrams.nodal@demo.nyaymitra.example',             dept: 'DARPG (pgportal.gov.in)' },
  ],

  // ── Free Legal Aid Request ─────────────────────────────────────────────
  'Free Legal Aid Request': [
    { label: 'District Legal Services Authority (DLSA)', email: 'dlsa.district@demo.nyaymitra.example',   dept: 'NALSA / DLSA' },
    { label: 'State Legal Services Authority (SLSA)',    email: 'slsa.state@demo.nyaymitra.example',       dept: 'SLSA' },
  ],

  // ── Other (generic fallback) ───────────────────────────────────────────
  'Other': [
    { label: 'District Collector / DM',          email: 'collector.district@demo.nyaymitra.example',       dept: 'District Administration' },
    { label: 'CPGRAMS – Public Grievance Portal', email: 'cpgrams.nodal@demo.nyaymitra.example',            dept: 'DARPG (pgportal.gov.in)' },
  ],
}

/**
 * Returns the list of suggested authorities for a given complaint category.
 * Falls back to "Other" if category not found.
 * @param {string} category
 * @returns {{ label: string, email: string, dept: string }[]}
 */
export function getAuthoritiesForCategory(category) {
  return AUTHORITY_MAP[category] ?? AUTHORITY_MAP['Other']
}
