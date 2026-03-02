"""
Pre-built legal knowledge base for Indian law.
Seeds the ChromaDB with essential legal information on first startup.
Enhanced with additional categories covering criminal law, education rights,
disability rights, cyber law, child rights, healthcare, environment, and police rights.
"""
import uuid
from rag.vectorstore import add_documents, get_stats, delete_collection
from rag.chunking import chunk_document

# Indian legal knowledge organized by category
LEGAL_KNOWLEDGE = [
    # ─── MGNREGA ───
    {
        "category": "MGNREGA",
        "source": "MGNREGA Act 2005",
        "text": """Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA) 2005:
Key Rights of Workers:
1. Every rural household is entitled to 100 days of guaranteed wage employment per financial year.
2. Employment must be provided within 15 days of application, otherwise unemployment allowance is payable.
3. Wages must be paid within 15 days of work completion. Delay attracts compensation at 0.05% per day.
4. Work must be provided within 5 km of the applicant's residence. If beyond 5 km, extra 10% wages as transport allowance.
5. At least one-third of beneficiaries must be women.
6. Worksite facilities: drinking water, shade, first aid, creche (if 5+ children below 6 years).
7. Workers can demand work by submitting a written application to the Gram Panchayat.
8. Job Card is free. No contractor or middleman involvement allowed.

How to file a complaint:
Step 1: Write to the Programme Officer of your block.
Step 2: If no response in 15 days, approach the District Programme Coordinator.
Step 3: File complaint on the MGNREGA portal or call 1800-345-3000 (toll-free).
Step 4: You can also file an RTI application to get information about fund allocation.

Important Sections:
- Section 3: Right to Employment
- Section 6: Unemployment Allowance
- Section 7: Wage Payment Timeline
- Section 28: Grievance Redressal"""
    },
    # ─── RTI ───
    {
        "category": "RTI",
        "source": "Right to Information Act 2005",
        "text": """Right to Information (RTI) Act 2005:
Every Indian citizen has the right to seek information from any public authority.

How to file an RTI:
1. Write application on plain paper addressed to the Public Information Officer (PIO).
2. Pay fee of ₹10 (BPL families are exempt).
3. Submit by post, in person, or online at rtionline.gov.in.
4. PIO must respond within 30 days (48 hours in life/liberty matters).
5. If dissatisfied, file First Appeal to the Appellate Authority within 30 days.
6. Second Appeal goes to the Central/State Information Commission.

What you can ask:
- Details of government schemes and funds allocated to your village
- Status of your pending applications
- Copies of official documents and records
- Details of government contracts and tenders
- Salary details of public servants

What is exempt:
- Information affecting national security (Section 8)
- Cabinet papers
- Trade secrets
- Personal information with no public interest

Penalty: PIO fined ₹250/day (max ₹25,000) for unreasonable delay or denial.

Key Sections:
- Section 3: Right to Information
- Section 6: Application procedure
- Section 7: Time limit for response
- Section 19: Appeals
- Section 20: Penalties"""
    },
    # ─── Consumer Protection ───
    {
        "category": "Consumer Rights",
        "source": "Consumer Protection Act 2019",
        "text": """Consumer Protection Act 2019:
Replaced the 1986 Act. Strengthens consumer rights in India.

Six Consumer Rights:
1. Right to Safety – protection from hazardous goods
2. Right to Information – know quality, quantity, potency, purity, price
3. Right to Choose – access to variety of goods at competitive prices
4. Right to be Heard – consumer interests receive due consideration
5. Right to Redressal – fair settlement of genuine grievances
6. Right to Consumer Education

Where to complain:
- District Consumer Forum: Claims up to ₹1 crore
- State Consumer Commission: Claims ₹1 crore to ₹10 crore
- National Consumer Commission: Claims above ₹10 crore
- Online: consumerhelpline.gov.in or call 1800-11-4000

Filing Process:
1. Send written complaint to the seller/service provider first.
2. If no response in 15 days, file complaint at Consumer Forum.
3. No lawyer required – you can represent yourself.
4. Court fee is minimal (₹100 to ₹5000 based on claim amount).
5. Complaint must be filed within 2 years of the cause of action.

New Features in 2019 Act:
- E-commerce platforms covered
- Product liability provisions
- Central Consumer Protection Authority (CCPA)
- Mediation as alternative dispute resolution"""
    },
    # ─── Labour Rights ───
    {
        "category": "Labour Rights",
        "source": "Various Labour Laws",
        "text": """Important Labour Laws in India:

1. Minimum Wages Act 1948:
- Employer must pay at least minimum wage as notified by State/Central Government.
- Varies by state, skill level, and type of work.
- Non-payment is a criminal offense: imprisonment up to 6 months and/or fine up to ₹500.
- Workers can complain to the Labour Commissioner.

2. Payment of Wages Act 1936:
- Wages must be paid before the 7th day of the next month (establishments < 1000 workers).
- For larger establishments, before the 10th day.
- Unauthorized deductions are prohibited.
- Workers can file claim within 12 months of the due date.

3. Bonded Labour System (Abolition) Act 1976:
- Bonded labour is illegal and punishable by imprisonment up to 3 years.
- Any debt agreement forcing labour is void.
- Freed bonded labourers are entitled to rehabilitation.
- Vigilance Committees must be set up at district level.
- Report to District Magistrate, Police, or National Human Rights Commission.

4. Unorganized Workers' Social Security Act 2008:
- Social security for unorganized workers (agriculture, construction, domestic, street vendors, etc.)
- Benefits: life and disability insurance, health insurance, old age protection, maternity benefit.
- Registration through e-Shram portal (eshram.gov.in).
- E-Shram card provides ₹2 lakh accidental insurance cover.

5. Building and Other Construction Workers Act 1996:
- Workers employed in construction for 90+ days can register with the Welfare Board.
- Benefits: education assistance, medical expenses, pension, housing loan, maternity benefit.
- Registration fee: ₹25 (some states waive this)."""
    },
    # ─── Land Rights ───
    {
        "category": "Land Rights",
        "source": "Various Land Laws",
        "text": """Land Rights in India:

1. Forest Rights Act (FRA) 2006:
- Tribal and forest-dwelling communities get legal rights to forest land they've been cultivating.
- Individual Forest Rights (IFR): Up to 4 hectares of land under actual cultivation.
- Community Forest Rights (CFR): Rights over community forest resources.
- How to claim: Apply to the Gram Sabha with evidence of occupation (satellite images, surveys, etc.)
- Gram Sabha is the authority to initiate and verify claims.
- No displacement without rehabilitation and consent of Gram Sabha.

2. Land Acquisition Act 2013 (LARR):
- Government must pay at least 2x market value in urban areas, 4x in rural areas.
- Social Impact Assessment (SIA) is mandatory before acquisition.
- Consent of 70% landowners needed for private projects, 80% for PPP projects.
- One-year rehabilitation and resettlement must be completed before possession.
- Affected families get employment, house, one-time settlement allowance, and annuity.
- Land returns to owner if unused for 5 years.

3. Prevention of Illegal Eviction:
- No one can be evicted without due process of law.
- Court order is mandatory for eviction.
- Dwellers of 10+ years get protection under various state laws.
- Slum dwellers have rights under respective state Slum Acts.

How to protect your land:
1. Ensure your land is registered (mutation/tathya) in revenue records.
2. Get the land survey done and keep records updated.
3. Pay land revenue/tax on time and keep receipts.
4. File RTI for land records if needed.
5. Approach the Tehsildar/Revenue Officer for disputes."""
    },
    # ─── Domestic Violence ───
    {
        "category": "Domestic Violence",
        "source": "Protection of Women from Domestic Violence Act 2005",
        "text": """Protection of Women from Domestic Violence Act 2005:

What is domestic violence?
Not just physical violence — includes:
1. Physical abuse: hitting, beating, slapping, kicking
2. Sexual abuse: forced intercourse, humiliating sexual acts
3. Verbal/emotional abuse: insults, ridicule, name calling, threats
4. Economic abuse: not providing money for food/necessities, preventing from working, taking away earnings

Who can file a complaint?
- Any woman in a domestic relationship (wife, live-in partner, mother, sister, daughter, etc.)
- It covers all women — not just married women.

What protection is available?
1. Protection Order: Prohibits respondent from committing violence, contacting, entering shared household.
2. Residence Order: Woman's right to live in the shared household. She cannot be evicted.
3. Monetary Relief: Maintenance, medical expenses, loss of earnings, compensation.
4. Custody Order: Temporary custody of children.

How to get help:
1. Call Women Helpline: 181 (toll-free, 24x7)
2. Call Police: 100 or 112
3. Contact Protection Officer (appointed by State Government in every district)
4. Go to nearest Magistrate court and file an application.
5. Contact NGOs or Legal Aid Center (free legal aid for women).
6. File online complaint at ncw.nic.in (National Commission for Women).

Key Points:
- Protection Officer must help with filing complaint, medical examination, shelter home.
- Free legal aid is available through District Legal Services Authority (DLSA).
- Ex-parte order (without hearing other side) can be passed in emergency.
- Relief is not limited to married women — live-in partners are covered."""
    },
    # ─── Government Schemes ───
    {
        "category": "Government Schemes",
        "source": "Central Government Scheme Guidelines",
        "text": """Major Government Schemes for Rural India:

1. PM-KISAN (Pradhan Mantri Kisan Samman Nidhi):
- ₹6,000/year in three installments of ₹2,000 each to small and marginal farmers.
- Eligibility: All landholding farmer families (subject to exclusion criteria).
- Apply at pmkisan.gov.in or through CSC/Gram Panchayat.

2. Ayushman Bharat (PM-JAY):
- Free health insurance cover of ₹5 lakh per family per year.
- For poor and vulnerable families identified by SECC data.
- Covers hospitalization, surgeries, and treatments.
- Check eligibility: mera.pmjay.gov.in or call 14555.

3. PM Awas Yojana (PMAY-Gramin):
- Financial assistance of ₹1.20 lakh (plain areas) / ₹1.30 lakh (hilly areas) for house construction.
- Beneficiary identified through SECC data based on housing deprivation.
- Toilet assistance of ₹12,000 under Swachh Bharat Mission.
- Apply through Gram Panchayat/Block Development Office.

4. PM Ujjwala Yojana:
- Free LPG connection to women from BPL households.
- Subsequent refill subsidy through Direct Benefit Transfer.
- Apply at nearest LPG distributor with BPL certificate and Aadhaar.

5. National Social Assistance Programme (NSAP):
- Old Age Pension (IGNOAPS): ₹200/month (60-79 years), ₹500/month (80+ years).
- Widow Pension (IGNWPS): ₹300/month.
- Disability Pension (IGNDPS): ₹300/month.
- National Family Benefit Scheme: ₹20,000 one-time to BPL family on death of breadwinner.

6. Sukanya Samriddhi Yojana:
- Savings scheme for girl child. Interest rate ~8% (highest among small savings).
- Invest ₹250 to ₹1.5 lakh per year. Account matures when girl turns 21.
- Tax deduction under Section 80C. Interest is tax-free."""
    },
    # ─── Legal Aid ───
    {
        "category": "Free Legal Aid",
        "source": "Legal Services Authorities Act 1987",
        "text": """Free Legal Aid in India — Legal Services Authorities Act 1987:

Who is eligible for free legal aid?
1. Members of Scheduled Castes or Scheduled Tribes
2. Victims of trafficking or forced labor (bonded labor)
3. Women and children
4. Persons with disabilities
5. Persons with annual income less than ₹3 lakh (High Court) / ₹1 lakh (other courts)
6. Victims of mass disaster, violence, flood, drought, earthquake
7. Industrial workers
8. Persons in custody (including under-trial prisoners)
9. Persons with unsound mind

What services are provided?
- Free lawyer for court cases
- Legal advice and consultation
- Drafting of legal documents
- Lok Adalat (People's Court) for quick settlement
- Mediation and conciliation
- Legal awareness camps

How to access free legal aid:
1. Visit the nearest Legal Services Authority office (every district has one).
2. Call the NALSA helpline: 15100
3. Apply online at nalsa.gov.in
4. Contact Taluk/District Legal Services Authority (TLSA/DLSA).
5. Visit the nearest Legal Aid Clinic (available at courts, law schools, and panchayats).

Lok Adalat:
- Free dispute resolution forum. No court fee.
- Award has same force as a court decree. No appeal.
- Covers: motor accident claims, labour disputes, matrimonial disputes, bank recovery, utility disputes.
- National Lok Adalat is held every quarter across all courts in India."""
    },
    # ─── Property Rights ───
    {
        "category": "Property Rights",
        "source": "Hindu Succession Act & Transfer of Property Act",
        "text": """Property Rights in India:

Women's Property Rights (Hindu Succession Amendment Act 2005):
- Daughters have EQUAL rights as sons in ancestral (coparcenary) property.
- This applies to ALL Hindu, Sikh, Jain, and Buddhist families.
- A married daughter retains her right to parental property.
- A woman's self-acquired property goes to her heirs (children and husband) if she dies without a will.

Succession without Will (Intestate Succession):
Class I heirs get equal share: Son, Daughter, Mother, Widow.
- All Class I heirs get equal share.
- If no Class I heir, property goes to Class II heirs (father, siblings, etc.)

Muslim Law:
- Wife gets 1/8th share if there are children, 1/4th if no children.
- Daughters get half the share of sons.
- Maximum 1/3rd property can be given through will (wasiyat).

Registration of Property:
- Sale deed MUST be registered under the Registration Act 1908.
- Registration charges: stamp duty (varies 3-8% by state) + registration fee (1%).
- Unregistered sale deed is NOT valid.
- Sub-Registrar office handles registration.

Rental Rights:
- Rent Control Act (varies by state) protects tenants from arbitrary eviction.
- Landlord cannot increase rent beyond prescribed percentage.
- Eviction only through court order on specified grounds.
- Tenants of 10+ years may get protection under state laws."""
    },

    # ═══════════════════════════════════════════════
    #  NEW CATEGORIES ADDED BELOW
    # ═══════════════════════════════════════════════

    # ─── Criminal Rights / Arrest Rights ───
    {
        "category": "Criminal Rights",
        "source": "Code of Criminal Procedure (CrPC) & Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023",
        "text": """Rights of an Arrested Person in India (CrPC / BNSS 2023):

Constitutional Protections:
- Article 20: No self-incrimination. You cannot be forced to be a witness against yourself.
- Article 21: Right to life and personal liberty. No detention without due process.
- Article 22: Right to be informed of grounds of arrest and right to legal counsel.

Rights at the Time of Arrest:
1. Right to know the grounds of arrest — police must inform you immediately.
2. Right to inform a friend, relative, or nominated person (Section 50A CrPC / BNSS Section 35).
3. Right to consult and be defended by a lawyer of your choice (Article 22).
4. Right to free legal aid if you cannot afford a lawyer (NALSA).
5. Right to be produced before a Magistrate within 24 hours of arrest.
6. Right to bail — bailable offenses: bail is a right, not a privilege.
7. Right to medical examination by a registered medical officer if requested.
8. Right against illegal detention beyond 24 hours without Magistrate's order.

Rights During Custody and Investigation:
1. Police cannot use force or torture to extract confessions.
2. Confession to police is NOT admissible in court (Section 25 Indian Evidence Act / Bharatiya Sakshya Adhiniyam).
3. Confessions before a Magistrate are valid but voluntary.
4. Section 41A CrPC (BNSS Section 35): Police must issue notice before arrest for offenses with < 7 years punishment — not mandatory to arrest.
5. Handcuffing is prohibited except in exceptional circumstances (Supreme Court ruling in Prem Shankar Shukla v. Delhi Administration).

Rights for Women:
- Women can only be arrested by a female police officer.
- Women cannot be arrested after sunset and before sunrise (except with prior permission of Magistrate).
- Arrested woman must be held in a separate female lock-up.

FIR Rights:
- You have the RIGHT to register an FIR. Police cannot refuse a cognizable offence FIR.
- If police refuse, complain to Superintendent of Police or approach Magistrate under Section 156(3) CrPC.
- Zero FIR can be filed at any police station, irrespective of jurisdiction.

Key Helplines:
- Police: 100 / 112
- Human Rights Commission: nhrc.nic.in or 14433
- Legal Aid: 15100"""
    },

    # ─── Education Rights ───
    {
        "category": "Education Rights",
        "source": "Right to Education Act 2009 & Related Laws",
        "text": """Right to Education (RTE) Act 2009 and Education Rights in India:

Fundamental Right:
- Article 21A makes free and compulsory education a Fundamental Right for children aged 6–14 years.

Key Provisions of RTE Act 2009:
1. Free and compulsory education in neighbourhood schools for children aged 6-14 years.
2. 25% seats reserved in private unaided schools for economically weaker sections (EWS) and disadvantaged groups.
3. No child shall be denied admission, expelled, or required to pass a board exam until completion of elementary education.
4. No physical punishment or mental harassment of children is permitted.
5. No capitation fees or screening for admission to elementary schools.
6. Schools must have infrastructure: playgrounds, toilets (separate for girls), libraries, clean drinking water.
7. Pupil-Teacher Ratio: 30:1 for primary (Class 1-5), 35:1 for upper primary (Class 6-8).

Who is a "disadvantaged group"?
- Children with disabilities
- Orphans and homeless children
- HIV-affected children
- SC/ST children
- Migrant children
- Children engaged in labor

How to use the 25% EWS reservation:
1. Apply to the school or online portal (varies by state, e.g., edudel.nic.in in Delhi).
2. Eligibility: Annual family income below ₹3.5 lakh (Central Govt criteria; states may differ).
3. Submit income certificate, residence proof, birth certificate, caste certificate (if applicable).
4. Admission lottery is conducted by the school/education department.

Mid-Day Meal Scheme (PM POSHAN):
- Free cooked meal to all students from Class 1 to 8 in government schools.
- Minimum 100 grams of food grain per child per day.
- Complaint: Contact District Education Officer or call 1800-180-8004.

Scholarships for Marginalized Students:
- Pre-Matric Scholarship: SC/ST students from Class 1-10. Apply at scholarships.gov.in.
- National Means-Cum-Merit Scholarship: For meritorious students from economically weaker sections in Class 8 onwards.
- Dr. Ambedkar Post Matric Scholarship: For SC students pursuing Class 11 to PhD.

Grievance Redressal:
1. Complain to Block Education Officer (BEO) or District Education Officer (DEO).
2. File complaint at RTE portal: rte25.nic.in
3. Approach State Commission for Protection of Child Rights (SCPCR).
4. National Commission for Protection of Child Rights (NCPCR) — Helpline: 1800-121-2830."""
    },

    # ─── Disability Rights ───
    {
        "category": "Disability Rights",
        "source": "Rights of Persons with Disabilities Act 2016",
        "text": """Rights of Persons with Disabilities (RPWD) Act 2016:

Recognized Disabilities (21 types, including):
- Blindness, low vision
- Deaf and hard of hearing
- Locomotor disability, cerebral palsy
- Intellectual disability, specific learning disabilities
- Mental illness
- Autism Spectrum Disorder
- Chronic neurological conditions (Parkinson's, multiple sclerosis)
- Acid attack victims
- Thalassemia, Hemophilia, Sickle Cell Disease

Key Rights Under RPWD Act 2016:
1. Reservation in Government Jobs: 4% horizontal reservation (1% for blind/low vision, 1% deaf, 1% locomotor, 1% others including autism/intellectual).
2. Reservation in Higher Education: 5% in all government higher educational institutions.
3. Free Education: Free and inclusive education for disabled children up to 18 years in government institutions.
4. Accessible Infrastructure: All public buildings, transport, digital platforms must be accessible.
5. Right to Live in Community: Cannot be isolated or institutionalized against will.
6. Protection against Discrimination: Discrimination on grounds of disability is prohibited in employment, education, healthcare.
7. Right to Legal Capacity: Right to make decisions about own life. Guardianship only as a last resort.

Disability Certificate:
- Obtained from government hospital's Medical Board.
- Benchmark Disability: 40% or more disability.
- Certificates can be uploaded on Unique Disability ID (UDID) portal: swavlambancard.gov.in
- UDID card gives access to all schemes and reservations.

Financial Support Schemes:
- ADIP Scheme: Assistive devices (wheelchairs, hearing aids, braille kits) provided free/subsidized.
- NHFDC Loans: National Handicapped Finance and Development Corporation — loans at 5% for self-employment.
- Disability Pension: Under NSAP — ₹300/month (Central). States may add more.

Key Grievance Contacts:
- Chief Commissioner for Persons with Disabilities: ccdisabilities.nic.in
- Complaint: File at State Commissioner for Persons with Disabilities office.
- Helpline: 1800-11-4515 (Divyangjan Helpline)."""
    },

    # ─── Cyber Crime and Digital Rights ───
    {
        "category": "Cyber Crime",
        "source": "Information Technology Act 2000 & IT (Amendment) Act 2008",
        "text": """Cyber Crime Laws and Digital Rights in India:

Information Technology Act 2000 (as amended in 2008):

Key Offenses and Penalties:
1. Hacking / Unauthorized Access (Section 66): Imprisonment up to 3 years and/or fine up to ₹5 lakh.
2. Identity Theft (Section 66C): Imprisonment up to 3 years and fine up to ₹1 lakh.
3. Cheating by Personation Online (Section 66D): Imprisonment up to 3 years and fine up to ₹1 lakh.
4. Stalking / Harassment Online (Section 354D IPC / BNS 2023): Imprisonment up to 5 years.
5. Sending Obscene Material (Section 67): Imprisonment up to 5 years and fine up to ₹10 lakh.
6. Child Pornography (Section 67B): Minimum 5 years imprisonment.
7. Cyber Terrorism (Section 66F): Imprisonment up to life.
8. Publishing Fake News (Section 505 IPC / BNS 2023): Imprisonment up to 3 years.

Common Cyber Crimes and What to Do:
- Online Fraud / UPI Scam: Report immediately to 1930 (Cyber Crime Helpline). Every minute counts — money can be frozen.
- Sextortion / Blackmail: Do NOT pay. Report to cybercrime.gov.in. Filing FIR will NOT make your content public.
- Social Media Hacking: Report to platform AND to cybercrime.gov.in.
- Fake Loan Apps: Report to RBI (sachet.rbi.org.in) and cybercrime.gov.in.
- Online Job Fraud: Report to cybercrime.gov.in and your local police.

How to File a Cyber Crime Complaint:
1. Online: Visit cybercrime.gov.in — 24x7 portal for all cyber crimes.
2. Helpline: Call 1930 (National Cyber Crime Helpline, toll-free, 24x7) — especially for financial fraud.
3. At Police Station: File complaint at the local police station — ask for the Cyber Crime Cell.
4. Preserve all evidence: screenshots, chat logs, call records, transaction IDs, email headers.

Banking/UPI Fraud — Immediate Steps:
1. Call 1930 immediately.
2. Call your bank's fraud helpline and block the account.
3. Complain on RBI's portal: cms.rbi.org.in within 3 days for zero-liability protection.
4. File FIR at cyber crime police station.

Digital Privacy Rights:
- Personal Data Protection Bill (under implementation) will give right to data correction, erasure, consent.
- Aadhaar data cannot be shared without consent. Misuse punishable under Aadhaar Act 2016.
- Your employer cannot access your personal device without consent."""
    },

    # ─── Child Rights ───
    {
        "category": "Child Rights",
        "source": "POCSO Act 2012, JJ Act 2015, Child Labour Prohibition Act",
        "text": """Child Rights and Protection Laws in India:

1. POCSO Act 2012 (Protection of Children from Sexual Offences):
- Any sexual act with a child below 18 years is an offence regardless of consent.
- Penetrative sexual assault: Minimum 10 years imprisonment (up to life).
- Aggravated POCSO (by family member, trusted person): Minimum 20 years.
- Sexual harassment without physical contact: Minimum 3 years.
- Mandatory reporting: Every person who has knowledge of a POCSO offence MUST report it to police/SJPU. Non-reporting is an offence punishable with 6 months jail.
- Child-friendly courts: Trials must be held in Special Courts. Identity of child victim cannot be disclosed.
- Report to: Police (1098 — Childline), local SJPU (Special Juvenile Police Unit), or DCPO.

2. Juvenile Justice (Care and Protection) Act 2015:
- Children in conflict with law: Juveniles (below 18) cannot be sent to prison. They go to Observation/Special Homes.
- Children in need of care: Orphans, abandoned, abused, trafficked children — referred to Child Welfare Committee (CWC).
- Children aged 16-18 accused of heinous offenses (e.g., rape, murder) can be tried as adults by Juvenile Justice Board.
- CHILDLINE Helpline: 1098 (24x7, toll-free).

3. Child Labour (Prohibition and Regulation) Amendment Act 2016:
- Complete prohibition of employment of children below 14 years.
- Children aged 14-18 cannot work in hazardous industries (mines, factories, fireworks).
- Penalty for employing child labour: ₹20,000 – ₹50,000 fine and/or 6 months to 2 years imprisonment.
- Family members (parents) employing children can be counselled but NOT fined for the first offence.
- Report child labour to: District Magistrate, Labour Department, or Childline (1098).

4. Child Marriage Prohibition Act 2006:
- Minimum age of marriage: 18 for girls, 21 for boys (proposed to raise girls' age to 21).
- Child marriage is voidable — can be annulled by the minor on reaching majority.
- Performing or abetting child marriage: Imprisonment up to 2 years and fine up to ₹1 lakh.
- Child Marriage Prohibition Officers are appointed in each district.
- Report to: Police, DCPO, or Childline 1098.

5. National Policy for Children 2013:
- Every child has rights to: survival, health, nutrition, education, identity, protection from exploitation.
- Children with disability, in conflict areas, and on the streets get special protections.

Key Contacts:
- Childline: 1098 (toll-free, 24x7)
- National Commission for Protection of Child Rights (NCPCR): ncpcr.gov.in, Helpline: 1800-121-2830
- State Commission for Protection of Child Rights (SCPCR) in each state."""
    },

    # ─── Healthcare Rights ───
    {
        "category": "Healthcare Rights",
        "source": "Clinical Establishments Act 2010 & Related Laws",
        "text": """Healthcare Rights of Patients in India:

Fundamental Rights in Healthcare:
- Article 21: Right to health is part of the right to life (Supreme Court interpretation).
- Every person has the right to emergency treatment regardless of ability to pay.

Rights of Patients (as per Indian Medical Council and Supreme Court guidelines):
1. Right to Emergency Treatment: No hospital — government or private — can refuse emergency treatment for lack of money or documents.
2. Right to Information: Patients have the right to know their diagnosis, treatment options, risks, and alternatives in a language they understand.
3. Right to Informed Consent: No surgical or invasive procedure can be done without written consent (except in life-threatening emergencies).
4. Right to Confidentiality: Medical records and diagnosis are private and cannot be disclosed without consent.
5. Right to Second Opinion: Patients can seek second medical opinion at any time.
6. Right to Access Medical Records: Patients and their nominees can access all medical records within 24 hours on request.
7. Right to Refuse Treatment: A competent adult has the right to refuse treatment, including life-sustaining treatment.

Government Healthcare Entitlements:
1. Ayushman Bharat (PM-JAY): ₹5 lakh health insurance for eligible families — check eligibility at mera.pmjay.gov.in or call 14555.
2. Janani Suraksha Yojana (JSY): Financial assistance for institutional delivery — ₹700 to ₹1,400 depending on state.
3. Pradhan Mantri Matru Vandana Yojana (PMMVY): ₹5,000 cash incentive for first child on meeting maternity and childcare conditions.
4. National Ambulance Services: Call 108 (emergency ambulance, free) across most states.
5. Rashtriya Bal Swasthya Karyakram (RBSK): Free health screening for children aged 0-18 at government schools and anganwadis.

Maternity Rights:
- Maternity Benefit Act 1961 (amended 2017): 26 weeks paid maternity leave for women in establishments with 10+ employees.
- Women working in MGNREGA: Entitled to maternity benefit under NREGA.
- Free delivery at all government hospitals under Janani Suraksha Yojana.

Mental Health Rights (Mental Healthcare Act 2017):
- Every person has the right to mental healthcare and treatment.
- Advance Directive: A person can specify treatment preferences in advance.
- No person with mental illness shall be subjected to cruel, inhuman, or degrading treatment.
- Insurance companies MUST provide coverage for mental illness at par with physical illness.
- iCall: 9152987821 (free mental health counseling).
- NIMHANS helpline: 080-46110007.
- Vandrevala Foundation: 1860-2662-345 (24x7).

Filing Medical Complaints:
1. Complaint against a doctor: File with State Medical Council (registered doctors) or Medical Council of India.
2. Complaint against a private hospital: File with State Clinical Establishments Authority or Consumer Forum.
3. Medical Negligence: Can file criminal complaint under IPC Section 304A or civil suit for compensation.
4. Ayushman Bharat grievances: Call 14555 or visit pmjay.gov.in."""
    },

    # ─── Environmental Rights ───
    {
        "category": "Environmental Rights",
        "source": "Environment Protection Act 1986 & Related Laws",
        "text": """Environmental Rights and Laws in India:

Constitutional Provisions:
- Article 21: Right to a clean and healthy environment is a Fundamental Right (Supreme Court in Subhash Kumar v. State of Bihar, 1991).
- Article 48A: State shall protect and improve the environment (Directive Principle).
- Article 51A(g): Fundamental Duty of every citizen to protect and improve the natural environment.

Key Environmental Laws:
1. Environment Protection Act 1986 (EPA):
- Central government can issue orders to prevent/control pollution.
- Penalty for violation: Imprisonment up to 5 years and/or fine up to ₹1 lakh.
- Citizens can approach the National Green Tribunal (NGT) directly.

2. National Green Tribunal Act 2010 (NGT):
- Specialized fast-track court for environmental disputes.
- Any citizen can file a complaint directly (no lawyer needed).
- Application fee: ₹1,000 (individuals).
- NGT has power to award compensation, impose penalties, issue injunctions.
- File at: ngt.gov.in or approach NGT benches in New Delhi, Bhopal, Pune, Kolkata, Chennai.

3. Water (Prevention and Control of Pollution) Act 1974:
- Discharging sewage or industrial waste into rivers/water bodies is illegal.
- State Pollution Control Board issues consents to industries.
- Citizens can file complaint with State Pollution Control Board (SPCB) or directly with NGT.

4. Air (Prevention and Control of Pollution) Act 1981:
- Industries must get consent from SPCB to operate.
- Vehicle pollution: File complaint with Regional Transport Office (RTO) or traffic police.
- Construction dust: File complaint with local Municipal Corporation or NGT.

5. Hazardous Waste Rules 2016:
- Hazardous waste cannot be disposed of near residential or water bodies.
- Hospitals must follow Bio-Medical Waste Management Rules 2016.
- Complaint to SPCB or NGT.

Citizens' Rights in Environmental Matters:
1. Right to public hearing in Environmental Impact Assessment (EIA): Citizens can object to projects affecting their environment.
2. Right to information about environmental clearances: File RTI with Ministry of Environment or SPCB.
3. Right to compensation: NGT can award compensation to affected communities.

Common Issues and Where to Complain:
- Factory pollution/illegal discharge: State Pollution Control Board (SPCB).
- River/water body contamination: File with SPCB and NGT.
- Noise pollution (beyond permissible limits): Local police or SPCB.
- Illegal tree cutting/forest destruction: Divisional Forest Officer (DFO) or NGT.
- Mining without clearance: District Magistrate, Ministry of Mines, or NGT.
- SAMEER App: Check real-time Air Quality Index and file air quality complaints (CPCB app)."""
    },

    # ─── Police Accountability ───
    {
        "category": "Police Accountability",
        "source": "Police Act & Supreme Court Guidelines (Prakash Singh Case)",
        "text": """Police Accountability and Complaints Against Police in India:

Your Rights Against Police Misconduct:
1. No police officer can detain you without grounds. Detention beyond 24 hours without Magistrate order is illegal.
2. Police cannot enter and search your home without a valid search warrant (except in case of fresh cognizable offenses or arrest).
3. Police cannot seize your property without a proper seizure memo and receipt given to you.
4. Custodial violence/torture is a criminal offense (Section 330/331 IPC / BNS 2023) and a Human Rights violation.
5. You have the right to see the warrant for your arrest or the FIR.
6. No police officer can demand bribe — it is an offense under Prevention of Corruption Act 1988.

Supreme Court Guidelines — D.K. Basu v. State of West Bengal (1997):
Mandatory requirements for arrest and detention:
1. Arresting officer must display accurate, visible, and clear identification and name tags.
2. Memo of arrest must be prepared at the time of arrest with a witness (family or local person).
3. Arrested person has right to inform a friend or relative of the arrest.
4. Medical examination of arrested person by a doctor within 48 hours.
5. Copies of all documents must be sent to Magistrate.
6. Legal aid must be available at every police station.

How to File a Complaint Against a Police Officer:
1. Complaint to Superintendent of Police (SP) or Commissioner of Police.
2. Complaint to the State Police Complaints Authority (established under Prakash Singh SC order).
3. Complaint to State Human Rights Commission or National Human Rights Commission (NHRC) — nhrc.nic.in or call 14433.
4. Criminal complaint before Magistrate under Section 156(3) CrPC — Magistrate can order investigation.
5. Writ Petition in High Court for fundamental rights violation.

Police Complaints Authority (Prakash Singh v. Union of India, 2006):
- Supreme Court directed all states to set up independent Police Complaints Authority.
- Can investigate complaints against senior officers (DSP and above).
- State-level and district-level authorities.

Custodial Death / Torture:
- Must be reported immediately by police to Magistrate, NHRC, and SHRC.
- NHRC must investigate all cases of custodial death.
- Magisterial inquiry is mandatory.
- File complaint immediately with NHRC at nhrc.nic.in or call 14433.

Anti-Corruption:
- Bribery: File complaint with Anti-Corruption Bureau (ACB) in your state.
- Vigilance Commission: Central Vigilance Commission (CVC) — cvc.gov.in.
- You can trap a bribe-seeking officer with police help — contact ACB.
- Whistleblowers Protection Act 2014 protects complainants from victimization."""
    },

    # ─── Caste Discrimination ───
    {
        "category": "Caste Discrimination",
        "source": "SC/ST Prevention of Atrocities Act 1989 (amended 2015)",
        "text": """Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act 1989 (amended 2015):

What is an Atrocity?
The Act lists specific offenses when committed against SC/ST members by non-SC/ST persons:
- Forcing a SC/ST person to eat inedible substances
- Parading naked or with acts of humiliation
- Wrongful occupation of land
- Cancelling voting rights or preventing voting
- Forcing to leave home or village
- Physical assault or sexual exploitation
- Denying access to water sources, roads, public places
- Abuse using caste name in a public place
- Fabricating evidence, filing false cases

Stringent Provisions:
- Special Courts (designated) try cases exclusively.
- Anticipatory bail generally NOT available to accused persons (non-SC/ST).
- Police must investigate and file charge sheet within 60 days.
- Trial must be completed within 2 months of charge sheet.
- State must provide witness protection.
- Victim entitled to relief and rehabilitation from the government.

Relief and Rehabilitation for Victims:
- Immediate first relief within 48 hours to 7 days after the incident.
- Compensation as per schedule (varies by offense — ₹85,000 to ₹8.25 lakh).
- Housing, agricultural land, and legal expenses borne by the state.
- Minimum wages during legal proceedings.

How to File an FIR:
1. Police MUST register FIR. No right to refuse under this Act.
2. If police refuse, approach Superintendent of Police (SP).
3. If SP refuses, approach Executive Magistrate or High Court.
4. A complaint can also be filed with the SC/ST Commission.

Important Contacts:
- National Commission for Scheduled Castes: ncsc.nic.in
- National Commission for Scheduled Tribes: ncst.nic.in
- Dalit helpline (varies by state, e.g., Karnataka: 14566)
- National Legal Services Authority (NALSA): 15100 — free legal aid.

Key Sections:
- Section 3: Offenses and penalties (imprisonment 6 months to life/death for most serious).
- Section 4: Neglect of duties by public servants — punishable with imprisonment.
- Section 14: Establishment of Special Courts.
- Section 15A: Rights of victims and witnesses (added in 2015 amendment)."""
    },

    # ─── Senior Citizen Rights ───
    {
        "category": "Senior Citizen Rights",
        "source": "Maintenance and Welfare of Parents and Senior Citizens Act 2007",
        "text": """Rights of Senior Citizens and Parents in India:

Maintenance and Welfare of Parents and Senior Citizens Act 2007:

Right to Maintenance:
- Parents and senior citizens (60+) can claim maintenance from their children or relatives.
- "Children" includes adult children (sons and daughters, biological and adoptive).
- "Relative" includes grandchildren, if parents/grandparents have no child.
- Maximum maintenance order: ₹10,000/month (Central; states can increase this limit).
- Application to Maintenance Tribunal (Sub-Divisional Magistrate).
- Tribunal must pass order within 90 days.
- If children abandon parents: Imprisonment up to 3 months and/or fine up to ₹5,000.

Gift/Transfer of Property — Cancellation:
- If a senior citizen transfers property to a child/relative and the child fails to provide basic needs, the Tribunal can declare the transfer void.
- This is a critical protection against property fraud by children.

Government Schemes for Senior Citizens:
1. Indira Gandhi National Old Age Pension (IGNOAPS): ₹200/month (60-79), ₹500/month (80+) for BPL seniors.
2. Pradhan Mantri Vaya Vandana Yojana (PMVVY): Pension scheme for 60+ with guaranteed return of 7.4% — invest up to ₹15 lakh.
3. Senior Citizen Savings Scheme (SCSS): 8%+ interest, invest up to ₹30 lakh, 5-year term.
4. Varistha Nagrik Swasthya Bima Yojana: Health insurance for senior citizens.
5. Rashtriya Vayoshri Yojana: Free assistive devices (hearing aids, walking frames, spectacles) for BPL senior citizens.
6. Ayushman Bharat Vaya Vandana Card: From 2024, all senior citizens aged 70+ eligible for ₹5 lakh health cover annually (regardless of income).

Other Protections:
- Priority seating and counters in banks, post offices, hospitals, railways.
- 50% concession in train fares for women 58+ and men 60+.
- Income Tax exemptions: Higher basic exemption limit (₹3 lakh for 60-79, ₹5 lakh for 80+).
- Protection from abuse: Elder abuse can be reported to police or Maintenance Tribunal.

Helplines:
- Elder Helpline: 14567 (Elderline, toll-free, operated by Ministry of Social Justice & Empowerment).
- National Helpline for Senior Citizens: 1800-180-1253."""
    },
]


def seed_knowledge_base(forced_reseed = False):
    """
    Seed the ChromaDB with pre-built legal knowledge.
    Only runs if the collection is empty (idempotent).
    """
    stats = get_stats()
    if stats["total_documents"] > 0 and not forced_reseed:
        print(f"Knowledge base already has {stats['total_documents']} documents. Skipping seed.", flush=True)
        return stats
    
    if forced_reseed:
        print("Forced reseed enabled. Clearing existing knowledge base...", flush=True)
        delete_collection()  # Clear existing data before seeding

    total_added = 0
    for entry in LEGAL_KNOWLEDGE:
        chunks, metadatas = chunk_document(
            entry["text"],
            metadata={"category": entry["category"], "source": entry["source"]},
            chunk_size=800
        )
        # Generate deterministic IDs based on category + index
        ids = [f"{entry['category'].lower().replace(' ', '_')}_{i}" for i in range(len(chunks))]
        add_documents(texts=chunks, metadatas=metadatas, ids=ids)
        total_added += len(chunks)
        print(f"  Added {len(chunks)} chunks from '{entry['source']}'", flush=True)

    print(f"Knowledge base seeded with {total_added} total chunks.", flush=True)
    return {"total_documents": total_added, "categories": [e["category"] for e in LEGAL_KNOWLEDGE]}