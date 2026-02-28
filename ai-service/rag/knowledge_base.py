"""
Pre-built legal knowledge base for Indian law.
Seeds the ChromaDB with essential legal information on first startup.
"""
import uuid
from rag.vectorstore import add_documents, get_stats
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
]


def seed_knowledge_base():
    """
    Seed the ChromaDB with pre-built legal knowledge.
    Only runs if the collection is empty (idempotent).
    """
    stats = get_stats()
    if stats["total_documents"] > 0:
        print(f"Knowledge base already has {stats['total_documents']} documents. Skipping seed.")
        return stats

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
        print(f"  Added {len(chunks)} chunks from '{entry['source']}'")

    print(f"Knowledge base seeded with {total_added} total chunks.")
    return {"total_documents": total_added, "categories": [e["category"] for e in LEGAL_KNOWLEDGE]}
