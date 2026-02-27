# IntegratedGov AI - Complete Requirements & Technical Specification Document

**Project:** IntegratedGov AI - Unified Rural Governance & Justice Platform  
**Version:** 1.0 (Prototype Phase)  
**Date:** February 2026  
**Team:** Gryffindor  
**Problem Statement:** PS3 - AI for Communities, Access & Public Impact

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Product Vision & Goals](#product-vision--goals)
3. [User Personas & Stories](#user-personas--stories)
4. [Core Features & Requirements](#core-features--requirements)
5. [Technical Architecture](#technical-architecture)
6. [Frontend Specification](#frontend-specification)
7. [Backend Specification](#backend-specification)
8. [AWS Services Integration](#aws-services-integration)
9. [Data Models & Database Schema](#data-models--database-schema)
10. [API Specifications](#api-specifications)
11. [Security & Compliance](#security--compliance)
12. [Testing Requirements](#testing-requirements)
13. [Deployment Strategy](#deployment-strategy)
14. [Success Metrics](#success-metrics)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Overview
IntegratedGov AI is India's first unified AI-powered platform combining legal aid (NyayMitra) and governance assistance (PanchayatGPT) for rural communities. The system serves 700M+ rural Indians by providing voice-native, offline-first access to legal services and government schemes.

### 1.2 Core Value Proposition
Unlike standalone apps, IntegratedGov AI's cross-module intelligence creates compound impact:
- Legal dispute patterns inform governance priorities
- Scheme implementation issues trigger proactive fixes
- Grievance trends shape budget allocations
- Preventive AI flags issues before crises

### 1.3 Target Prototype Scope (MVP)
**Timeframe:** 4-6 weeks  
**Focus:** Demonstrate core integration advantage with working end-to-end flows

**In Scope for Prototype:**
- ✅ Voice input/output in 2 languages (Hindi + English)
- ✅ NyayMitra: Legal notice generation + eCourt mock integration
- ✅ PanchayatGPT: Scheme search + budget allocation
- ✅ Integration layer: Pattern detection + cross-module alerts
- ✅ Mobile-responsive web app (PWA)
- ✅ Basic admin dashboard

**Out of Scope (Post-Prototype):**
- ❌ Full 22 language support (add in Phase 2)
- ❌ WhatsApp bot integration (Phase 2)
- ❌ IVR system (Phase 2)
- ❌ Complete offline functionality (Phase 2)
- ❌ Real eCourts/MGNREGA API integration (use mocks)

---

## 2. PRODUCT VISION & GOALS

### 2.1 Vision Statement
Empower rural India with AI-powered legal and governance tools that work in their language, on their devices, solving their real problems.

### 2.2 Primary Goals
1. **Access:** Enable 85% rural Indians to file legal cases without lawyers
2. **Efficiency:** Reduce Panchayat report generation from 45 days → 2 hours
3. **Integration:** Demonstrate cross-module intelligence preventing future disputes
4. **Scalability:** Serverless architecture supporting 100K+ concurrent users
5. **Trust:** Government-ready with security, audit trails, and API compliance

### 2.3 Success Criteria (Prototype)
- [ ] User can file a legal complaint via voice in <5 minutes
- [ ] AI generates legally valid notice in Hindi/English
- [ ] Panchayat member can search schemes via voice
- [ ] Integration engine detects MGNREGA dispute pattern and alerts Sarpanch
- [ ] System works on 3G networks with <3 second response times
- [ ] Admin dashboard shows real-time cross-module insights

---

## 3. USER PERSONAS & STORIES

### 3.1 Primary Personas

#### Persona 1: Ramesh (Rural Farmer)
**Demographics:**
- Age: 42, Male
- Location: Village in Uttar Pradesh
- Education: 5th grade
- Language: Hindi
- Device: ₹8,000 Android phone, 3G internet
- Income: ₹6,000/month

**Pain Points:**
- MGNREGA wages delayed for 2 months (₹4,500 pending)
- Cannot afford lawyer (₹15,000 consultation fee)
- Doesn't know legal rights or how to file complaint
- Village is 25km from district court

**Goals:**
- File legal complaint quickly without traveling
- Understand rights in simple Hindi
- Track case status via SMS
- Get wages released

**User Stories:**
```
As Ramesh, I want to file a legal complaint via voice in Hindi,
So that I can get my pending MGNREGA wages without hiring a lawyer.

As Ramesh, I want to receive SMS updates about my case hearings,
So that I don't miss important court dates.

As Ramesh, I want to upload photos of my job card as evidence,
So that I can prove my work attendance.
```

---

#### Persona 2: Sunita (Sarpanch)
**Demographics:**
- Age: 38, Female
- Location: Village in Maharashtra
- Education: 12th grade
- Language: Hindi + Marathi
- Device: ₹15,000 smartphone, 4G internet
- Role: Elected Sarpanch managing ₹15L annual budget

**Pain Points:**
- 200+ government schemes, doesn't know which village qualifies for
- Budget allocation requires approval from BDO, takes 45 days
- Gram Sabha meeting minutes must be typed in Marathi and uploaded to ePanchayat
- Recurring citizen grievances (hand pump issues, ration card problems)

**Goals:**
- Find relevant schemes quickly
- Allocate budget optimally with benchmarking data
- Automate meeting minutes generation
- Track and resolve grievances within 7 days

**User Stories:**
```
As Sunita, I want to speak village needs in Marathi and get matched schemes,
So that I can apply for maximum government benefits for my village.

As Sunita, I want AI to suggest budget allocation based on village priorities,
So that I can make data-driven decisions and get BDO approval faster.

As Sunita, I want meeting transcription and automatic minutes generation,
So that I can upload to ePanchayat within 2 hours instead of 2 weeks.

As Sunita, I want alerts when legal cases indicate systemic issues (MGNREGA delays),
So that I can proactively fix governance gaps before more disputes arise.
```

---

#### Persona 3: Legal Aid Worker (Supporting Role)
**Demographics:**
- Age: 29, Female
- Location: District Legal Services Authority office
- Education: LLB
- Device: Laptop + smartphone

**Pain Points:**
- 50+ walk-in clients per week, can only help 10 due to time constraints
- Many cases are straightforward (wage disputes, consumer issues) but require legal notice drafting
- Rural clients don't understand legal jargon

**Goals:**
- Scale legal aid using AI for simple cases
- Review and verify AI-generated notices
- Focus time on complex cases requiring court representation

**User Stories:**
```
As a Legal Aid Worker, I want to review AI-generated legal notices,
So that I can verify accuracy before filing to eCourts.

As a Legal Aid Worker, I want to see dashboard of cases filed via the platform,
So that I can identify cases needing in-person legal representation.
```

---

### 3.2 User Journey Maps

#### Journey 1: Ramesh Files MGNREGA Wage Complaint

```
STAGE 1: Problem Recognition
- Ramesh hasn't received ₹4,500 MGNREGA wages for 2 months
- Doesn't know this is a legal rights violation
- Emotion: Frustrated, Helpless

STAGE 2: Discovery
- Ward member tells Ramesh about IntegratedGov AI app
- Ramesh installs app on his Android phone
- Emotion: Curious, Skeptical

STAGE 3: Voice Input
- Ramesh clicks "Legal Complaint" button
- Speaks in Hindi: "मुझे MGNREGA की मजदूरी 2 महीने से नहीं मिली है"
- AI transcribes and asks clarifying questions
- Emotion: Hopeful, Nervous

STAGE 4: AI Processing
- AI categorizes as "MGNREGA Wage Dispute"
- Generates legal notice in Hindi citing relevant labor laws
- Shows preview to Ramesh
- Emotion: Surprised, Impressed

STAGE 5: Confirmation
- Ramesh reviews notice (AI reads aloud in Hindi)
- Adds photo of job card as evidence
- Confirms filing
- Emotion: Relieved, Empowered

STAGE 6: Filing & Tracking
- System auto-files to eCourts (mock in prototype)
- Ramesh receives SMS: "Case filed. Case #LC/2026/12345"
- Can track status in app
- Emotion: Confident

STAGE 7: Integration Magic (Hidden from User)
- Integration engine detects: 5th MGNREGA case this month from same Panchayat
- Alerts Sunita (Sarpanch) via PanchayatGPT
- Creates action item: "Contact BDO for payment release"
- Emotion: N/A (Backend process)

STAGE 8: Resolution
- Sunita calls BDO, ₹45,000 released for 12 workers including Ramesh
- Ramesh receives SMS: "Payment released, will credit in 2 days"
- Ramesh withdraws legal case
- Emotion: Grateful, Satisfied
```

---

## 4. CORE FEATURES & REQUIREMENTS

### 4.1 Module 1: NyayMitra (Legal Aid)

#### Feature 1.1: Voice-Based Legal Complaint Filing

**Priority:** P0 (Must-Have for Prototype)

**Functional Requirements:**
- FR-1.1.1: System shall accept voice input in Hindi and English
- FR-1.1.2: System shall transcribe voice to text using Amazon Transcribe
- FR-1.1.3: System shall detect language automatically (Hindi vs English)
- FR-1.1.4: System shall ask clarifying questions if input is ambiguous
  - Example: "Is this about unpaid wages or workplace injury?"
- FR-1.1.5: System shall categorize complaint into predefined types:
  - MGNREGA Wage Dispute
  - Land Boundary Dispute
  - Ration Card Denial
  - Consumer Protection Issue
  - Other (free-form)
- FR-1.1.6: System shall extract key entities using Amazon Comprehend:
  - Amount owed
  - Date of incident
  - Parties involved
  - Location

**Non-Functional Requirements:**
- NFR-1.1.1: Voice transcription accuracy ≥90% for Hindi and English
- NFR-1.1.2: End-to-end voice input to text display ≤3 seconds
- NFR-1.1.3: System shall work on 3G networks (handle 500kbps bandwidth)
- NFR-1.1.4: Voice recordings shall be stored in S3 with 1-year retention

**Acceptance Criteria:**
```
Given Ramesh speaks "मुझे MGNREGA की मजदूरी नहीं मिली"
When the system processes the voice input
Then it should:
  - Transcribe to Hindi text within 3 seconds
  - Categorize as "MGNREGA Wage Dispute"
  - Extract entity: wages = "MGNREGA"
  - Ask: "कितने रुपये बकाया हैं?" (How much is owed?)
```

**UI/UX Requirements:**
- Large microphone button (min 80px diameter) for easy tap
- Visual feedback during recording (waveform animation)
- Show transcribed text in real-time
- "Edit" button to correct transcription mistakes
- Text-to-speech playback of transcription for verification

---

#### Feature 1.2: AI Legal Notice Generation

**Priority:** P0 (Must-Have for Prototype)

**Functional Requirements:**
- FR-1.2.1: System shall use Amazon Bedrock (Claude) to generate legal notice
- FR-1.2.2: System shall use predefined templates for each complaint type
- FR-1.2.3: Generated notice shall include:
  - Complainant details (name, address, contact)
  - Respondent details (employer, government office, company)
  - Facts of the case (dates, amounts, events)
  - Legal provisions cited (relevant laws)
  - Relief sought (payment, compensation, action)
  - Date and place
- FR-1.2.4: Notice shall be generated in same language as input (Hindi/English)
- FR-1.2.5: System shall allow user to review and edit generated notice via voice/text
- FR-1.2.6: System shall provide text-to-speech playback of notice in user's language

**Templates (Prototype Scope):**

**Template 1: MGNREGA Wage Dispute**
```
Input Entities:
- complainant_name
- village
- district
- work_period_start
- work_period_end
- days_worked
- amount_owed
- job_card_number
- respondent (Block Development Officer)

Output Format:
LEGAL NOTICE
[Date]

To,
The Block Development Officer
[District]

Subject: Non-payment of MGNREGA wages

Sir/Madam,

I, [complainant_name], resident of [village], [district], hereby give you notice 
that I have worked under MGNREGA from [work_period_start] to [work_period_end] 
for [days_worked] days under Job Card No. [job_card_number].

As per MGNREGA Act 2005 Section 3(2), wages must be paid within 15 days. However, 
₹[amount_owed] remains unpaid for [days_overdue] days, which is a violation of 
my statutory rights.

I demand immediate payment of ₹[amount_owed] plus compensation under Section 3(3) 
for delayed payment (0.05% per day).

If payment is not made within 7 days, I shall file a formal complaint under 
MGNREGA Section 27 and pursue legal action.

Yours sincerely,
[complainant_name]
[Digital Signature]
```

**Non-Functional Requirements:**
- NFR-1.2.1: Notice generation ≤5 seconds
- NFR-1.2.2: Generated notices shall be legally valid (reviewed by legal expert)
- NFR-1.2.3: Notices shall be generated in PDF format with digital signature placeholder
- NFR-1.2.4: System shall log all edits made by user for audit trail

**Acceptance Criteria:**
```
Given complaint details: Name=Ramesh Kumar, Village=Kareli, District=Sitapur, 
      Amount=₹4,500, Days=62, Job Card=UP-01-234-567
When AI generates legal notice
Then it should:
  - Include all required sections
  - Cite MGNREGA Act 2005 Section 3(2) and 3(3)
  - Calculate compensation: ₹4,500 * 0.05% * 47 days (overdue) = ₹105.75
  - Generate in Hindi if input was Hindi
  - Format as professional legal document
  - Complete generation in <5 seconds
```

---

#### Feature 1.3: Case Filing & Tracking

**Priority:** P0 (Prototype: Mock eCourts API)

**Functional Requirements:**
- FR-1.3.1: System shall provide "File to eCourts" and "Download PDF" options
- FR-1.3.2: For prototype, "File to eCourts" shall call mock API and generate case number
- FR-1.3.3: Case number format: LC/[YEAR]/[5-digit-random] (e.g., LC/2026/12345)
- FR-1.3.4: System shall send SMS confirmation with case number
- FR-1.3.5: User shall be able to view case status in app
- FR-1.3.6: System shall store case in DynamoDB with status tracking:
  - Status: FILED → PENDING_HEARING → HEARING_SCHEDULED → UNDER_REVIEW → RESOLVED/WITHDRAWN
- FR-1.3.7: For prototype, user can manually update status (simulate eCourts updates)

**Non-Functional Requirements:**
- NFR-1.3.1: Case data shall be encrypted at rest (AWS KMS)
- NFR-1.3.2: PDF generation ≤2 seconds
- NFR-1.3.3: SMS delivery ≤10 seconds

**Acceptance Criteria:**
```
Given Ramesh files legal notice
When he clicks "File to eCourts"
Then system should:
  - Generate case number LC/2026/XXXXX
  - Store case in database with status=FILED
  - Send SMS: "केस दर्ज हो गया। केस नंबर: LC/2026/12345"
  - Show case in "My Cases" section of app
  - Allow download as PDF
```

---

#### Feature 1.4: Evidence Upload

**Priority:** P1 (Nice-to-Have for Prototype)

**Functional Requirements:**
- FR-1.4.1: User shall be able to upload photos from camera or gallery
- FR-1.4.2: Supported formats: JPG, PNG (max 5MB per file, max 5 files)
- FR-1.4.3: System shall store images in S3 with presigned URLs
- FR-1.4.4: Images shall be linked to case number
- FR-1.4.5: User shall be able to add caption/description to each image

**UI/UX Requirements:**
- Camera icon button in case filing flow
- Image preview with delete option
- Compression for large images (reduce to <1MB)

---

### 4.2 Module 2: PanchayatGPT (Governance)

#### Feature 2.1: Voice-Based Scheme Search

**Priority:** P0 (Must-Have for Prototype)

**Functional Requirements:**
- FR-2.1.1: System shall accept voice input describing village needs
- FR-2.1.2: System shall use Amazon Bedrock with RAG (Retrieval Augmented Generation)
- FR-2.1.3: Scheme database shall include 20 schemes for prototype (expandable to 200+):
  
**Prototype Scheme Database (20 schemes):**
```
Central Schemes (10):
1. PM-KISAN: ₹6,000/year direct cash to farmers
2. MGNREGA: 100 days guaranteed employment
3. Pradhan Mantri Awas Yojana (Rural): Housing for all
4. Jal Jeevan Mission: Piped water to every household
5. Swachh Bharat Mission (Gramin): Toilet construction
6. PM Fasal Bima Yojana: Crop insurance
7. Ayushman Bharat: Free health insurance up to ₹5 lakh
8. National Social Assistance Programme: Pension for elderly/widow/disabled
9. Mid-Day Meal Scheme: Free meals for school children
10. Pradhan Mantri Gram Sadak Yojana: Rural road connectivity

State Schemes (10 - UP/Maharashtra examples):
11. UP: Mukhyamantri Kisan Evam Sarvhit Bima Yojana: Accident insurance for farmers
12. UP: Mukhyamantri Kanya Sumangla Yojana: Financial aid for girl child education
13. Maharashtra: Mahatma Jyotiba Phule Shetkari Karj Mukti Yojana: Farm loan waiver
14. Maharashtra: Shiv Bhojan Thali: ₹10 meal scheme
15-20: [Add 6 more relevant state schemes]
```

- FR-2.1.4: System shall match voice input to schemes using semantic search
- FR-2.1.5: System shall return top 3 relevant schemes with:
  - Scheme name
  - Brief description (50 words)
  - Eligibility criteria
  - Benefits amount/nature
  - Application process (simplified)
  - Documents required
- FR-2.1.6: System shall provide text-to-speech output of scheme details

**Example Matching:**

```
Input (Voice): "हमारे गांव में पानी की समस्या है, पाइप लाइन नहीं है"
(Our village has water problem, no pipeline)

AI Processing:
- Detect keywords: water, pipeline, village
- Semantic match: Water supply infrastructure
- Retrieve schemes: Jal Jeevan Mission (primary match)

Output:
"आपके लिए 3 योजनाएं मिलीं:

1. जल जीवन मिशन (Jal Jeevan Mission)
   - हर घर में नल का पानी
   - 100% खर्च केंद्र सरकार
   - पात्रता: सभी ग्रामीण घर
   - आवेदन: ग्राम पंचायत प्रस्ताव पास करें

2. MGNREGA
   - पानी संरक्षण कार्य (तालाब, चेक डैम)
   - 100 दिन रोजगार गारंटी
   - बजट उपलब्ध
   
3. 14वां वित्त आयोग अनुदान
   - पानी की टंकी निर्माण
   - ग्राम पंचायत के बुनियादी ढांचे के लिए"
```

**Non-Functional Requirements:**
- NFR-2.1.1: Scheme search response time ≤4 seconds
- NFR-2.1.2: Semantic matching accuracy ≥80%
- NFR-2.1.3: Scheme database shall be stored in vector database (Amazon OpenSearch or DynamoDB with embeddings)

**Acceptance Criteria:**
```
Given Sunita says "हमें स्कूल में शौचालय चाहिए"
When system processes the request
Then it should:
  - Transcribe correctly
  - Match to: Swachh Bharat Mission (primary), MGNREGA (secondary)
  - Return top 3 schemes in Hindi
  - Include eligibility: all government schools
  - Show documents: Gram Sabha resolution, school enrollment
```

---

#### Feature 2.2: AI Budget Allocation Optimizer

**Priority:** P0 (Must-Have for Prototype)

**Functional Requirements:**
- FR-2.2.1: User shall input total available budget (e.g., ₹15,00,000)
- FR-2.2.2: User shall select priority areas from predefined categories:
  - Roads & Infrastructure (25-40%)
  - Water & Sanitation (20-35%)
  - Education (10-20%)
  - Health (5-15%)
  - Agriculture (5-15%)
  - Others (5-10%)
- FR-2.2.3: System shall use AI (Amazon SageMaker or Bedrock) to suggest optimal allocation
- FR-2.2.4: AI shall consider:
  - Village population
  - Existing infrastructure status (user inputs: Good/Average/Poor)
  - Historical spending patterns (mock data in prototype)
  - Benchmarking against similar Panchayats (5 sample villages in prototype)
- FR-2.2.5: System shall show justification for each allocation:
  - "Roads: ₹5,00,000 (33%) - Village has 12km unpaved roads, higher than district average of 8km"
- FR-2.2.6: User shall be able to adjust allocations manually with real-time recalculation
- FR-2.2.7: System shall generate budget allocation report as PDF

**Budget Optimizer Algorithm (Simplified for Prototype):**

```python
def optimize_budget(total_budget, priorities, village_data):
    """
    Inputs:
    - total_budget: float (e.g., 1500000)
    - priorities: dict {'roads': 'high', 'water': 'medium', ...}
    - village_data: dict {
        'population': int,
        'infrastructure_status': dict {'roads': 'poor', 'water': 'average', ...},
        'similar_villages_avg': dict {'roads': 0.35, 'water': 0.28, ...}
      }
    
    Output:
    - allocation: dict {'roads': 500000, 'water': 400000, ...}
    - justifications: dict {'roads': 'Explanation text', ...}
    """
    
    # Base percentages from similar villages
    base_allocation = village_data['similar_villages_avg']
    
    # Adjust based on infrastructure status
    adjustments = {
        'poor': 1.3,    # Increase allocation by 30%
        'average': 1.0,  # No change
        'good': 0.7     # Reduce by 30%
    }
    
    # Adjust based on priority
    priority_weights = {
        'high': 1.2,
        'medium': 1.0,
        'low': 0.8
    }
    
    adjusted_allocation = {}
    for category in base_allocation:
        infra_status = village_data['infrastructure_status'].get(category, 'average')
        priority = priorities.get(category, 'medium')
        
        adjusted_pct = base_allocation[category] * adjustments[infra_status] * priority_weights[priority]
        adjusted_allocation[category] = adjusted_pct
    
    # Normalize to 100%
    total_pct = sum(adjusted_allocation.values())
    final_allocation = {k: (v/total_pct) * total_budget for k, v in adjusted_allocation.items()}
    
    # Generate justifications
    justifications = {}
    for category in final_allocation:
        justifications[category] = f"{category.title()}: ₹{final_allocation[category]:,.0f} ({final_allocation[category]/total_budget*100:.1f}%) - Infrastructure status is {village_data['infrastructure_status'][category]}, priority is {priorities[category]}"
    
    return final_allocation, justifications
```

**Non-Functional Requirements:**
- NFR-2.2.1: Budget calculation ≤2 seconds
- NFR-2.2.2: PDF report generation ≤3 seconds

**Acceptance Criteria:**
```
Given Sunita inputs:
  - Total Budget: ₹15,00,000
  - Priority: Roads=High, Water=High, Education=Medium
  - Infrastructure: Roads=Poor, Water=Average, Education=Good
When system optimizes allocation
Then it should suggest:
  - Roads: ₹5,50,000 (37%) - "Poor condition, high priority, above district avg"
  - Water: ₹4,00,000 (27%) - "Average condition, high priority"
  - Education: ₹2,50,000 (17%) - "Good condition but mandatory spending"
  - Health: ₹1,50,000 (10%)
  - Agriculture: ₹1,00,000 (7%)
  - Others: ₹50,000 (3%)
  Total: ₹15,00,000 (100%)
```

---

#### Feature 2.3: Meeting Minutes Automation

**Priority:** P1 (Nice-to-Have for Prototype)

**Functional Requirements:**
- FR-2.3.1: User shall be able to start voice recording of Gram Sabha meeting
- FR-2.3.2: System shall transcribe in real-time using Amazon Transcribe
- FR-2.3.3: System shall use Amazon Bedrock to summarize key decisions:
  - Budget allocations approved
  - Schemes applied for
  - Grievances raised
  - Action items assigned
- FR-2.3.4: System shall generate formatted minutes document
- FR-2.3.5: User shall be able to review and edit minutes before finalizing
- FR-2.3.6: System shall generate PDF in format required by ePanchayat

**Acceptance Criteria:**
```
Given Sunita records 30-minute Gram Sabha meeting in Marathi
When system processes the recording
Then it should:
  - Transcribe with 85%+ accuracy
  - Identify 5 key decisions
  - Generate formatted minutes in Marathi
  - Include attendee list (user enters)
  - Add digital signature placeholder
  - Generate PDF within 60 seconds of recording end
```

---

#### Feature 2.4: Grievance Tracking System

**Priority:** P0 (Must-Have for Prototype)

**Functional Requirements:**
- FR-2.4.1: Citizen shall be able to file grievance via voice (integrated with Legal module UI)
- FR-2.4.2: System shall categorize grievance:
  - Infrastructure (road, water, electricity)
  - Sanitation (toilet, drainage, garbage)
  - Administrative (ration card, certificate delay)
  - Other
- FR-2.4.3: System shall capture GPS location of complaint (optional, user consent)
- FR-2.4.4: System shall auto-assign grievance to relevant Panchayat member:
  - Water issues → Water & Sanitation Committee member
  - Roads → Infrastructure Committee
  - Default → Ward Member of that area
- FR-2.4.5: Assigned person receives SMS: "नया शिकायत: [description]. ट्रैक करें: [app_link]"
- FR-2.4.6: System shall track grievance status:
  - OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
- FR-2.4.7: If status remains ASSIGNED for >24 hours, escalate to Sarpanch
- FR-2.4.8: If status remains IN_PROGRESS for >7 days, escalate to BDO (mock in prototype)
- FR-2.4.9: Citizen receives SMS on status updates

**UI Components:**
- Grievance filing form (voice + text + photo)
- Panchayat dashboard showing open/assigned/resolved counts
- Grievance detail view with timeline
- Status update buttons for Panchayat members

**Acceptance Criteria:**
```
Given citizen files grievance "गांव की मुख्य सड़क टूटी है"
When system processes it
Then it should:
  - Categorize as "Infrastructure - Roads"
  - Auto-assign to Infrastructure Committee Chairperson
  - Send SMS to assignee within 10 seconds
  - Set status = ASSIGNED
  - Create ticket #GR/2026/XXXXX
  - Send SMS to citizen: "शिकायत दर्ज हुई। टिकट नंबर: GR/2026/12345"
  - If no update in 24 hours, send reminder to assignee
```

---

### 4.3 Module 3: Integration Layer (Cross-Module Intelligence)

#### Feature 3.1: Pattern Detection Engine

**Priority:** P0 (Must-Have for Prototype - This is the Core Differentiator!)

**Functional Requirements:**
- FR-3.1.1: System shall monitor legal cases filed via NyayMitra
- FR-3.1.2: System shall detect patterns requiring governance action:

**Pattern 1: MGNREGA Wage Dispute Cluster**
```
Trigger Condition:
- ≥3 MGNREGA wage dispute cases filed from same Panchayat within 30 days

Action:
- Create alert in PanchayatGPT dashboard
- Send SMS to Sarpanch: "⚠️ Alert: 3 MGNREGA wage cases filed. Total ₹XX,XXX pending. Action: Contact BDO for payment release."
- Create action item with high priority
- Track if Sarpanch takes action within 7 days

Expected Outcome:
- Proactive payment release preventing further legal cases
```

**Pattern 2: Ration Card Denial Spike**
```
Trigger Condition:
- ≥5 ration card denial cases from same village within 60 days

Action:
- Alert Sarpanch: "Systemic issue detected in ration card distribution"
- Suggest: Review eligibility list with Food & Civil Supplies Officer
- Flag for Gram Sabha discussion

Expected Outcome:
- Fix scheme implementation gap, prevent future denials
```

**Pattern 3: Land Dispute Geographic Cluster**
```
Trigger Condition:
- ≥5 land boundary disputes with GPS coordinates within 2km radius

Action:
- Recommend budget allocation for land survey
- Generate cost estimate: ₹50,000 - ₹2,00,000 based on area
- Add to next Gram Sabha agenda

Expected Outcome:
- Preventive boundary demarcation resolving disputes
```

**Pattern 4: Grievance Category Trend**
```
Trigger Condition:
- Same grievance category (e.g., water supply) has ≥10 complaints in 90 days

Action:
- Trigger NyayMitra legal rights awareness campaign for that category
- Example: If 10 water complaints, send SMS to all villagers:
  "आपको हर दिन 55 लीटर पानी का अधिकार है। यदि नहीं मिल रहा, शिकायत करें।"

Expected Outcome:
- Inform citizens of rights, increase complaint resolution pressure
```

**Implementation:**
```javascript
// Pattern Detection Service (runs every 6 hours as AWS Lambda cron)

async function detectPatterns() {
  // Query 1: MGNREGA wage dispute cluster
  const mgnregaCases = await db.query({
    TableName: 'LegalCases',
    FilterExpression: 'case_type = :type AND created_at > :date AND panchayat_id = :panchayat',
    ExpressionAttributeValues: {
      ':type': 'MGNREGA_WAGE_DISPUTE',
      ':date': Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
      ':panchayat': panchayatId
    }
  });
  
  if (mgnregaCases.Count >= 3) {
    // Trigger alert
    await createGovernanceAlert({
      type: 'MGNREGA_PAYMENT_DELAY',
      panchayat_id: panchayatId,
      case_count: mgnregaCases.Count,
      total_amount: mgnregaCases.Items.reduce((sum, c) => sum + c.amount_owed, 0),
      action_required: 'Contact BDO for payment release',
      priority: 'HIGH'
    });
    
    // Send SMS to Sarpanch
    await sendSMS(sarpanchPhone, `⚠️ Alert: ${mgnregaCases.Count} MGNREGA wage cases. Total ₹${totalAmount}. Action needed.`);
  }
  
  // Query 2: Ration card denial spike
  // ... similar logic
  
  // Query 3: Land dispute cluster
  // ... with GPS proximity calculation
  
  // Query 4: Grievance trend analysis
  // ... category-wise aggregation
}
```

**Non-Functional Requirements:**
- NFR-3.1.1: Pattern detection shall run every 6 hours (AWS EventBridge cron)
- NFR-3.1.2: Alert delivery ≤30 seconds after pattern detection
- NFR-3.1.3: False positive rate ≤10% (thresholds tuned based on testing)

**Acceptance Criteria:**
```
Given 3 MGNREGA wage cases filed from Kareli Panchayat in last 15 days
When pattern detection runs
Then it should:
  - Detect pattern match for "MGNREGA Wage Dispute Cluster"
  - Calculate total pending: ₹12,500
  - Create alert in PanchayatGPT with HIGH priority
  - Send SMS to Sarpanch Sunita
  - Create action item: "Contact BDO - MGNREGA payment delay"
  - Log pattern detection in analytics database
```

---

#### Feature 3.2: Cross-Module Dashboard

**Priority:** P0 (Must-Have for Prototype)

**Functional Requirements:**
- FR-3.2.1: Admin dashboard shall show integrated metrics:
  
**Dashboard Widgets:**

```
1. Legal Cases Overview
   - Total cases filed: [count]
   - By category: MGNREGA (X), Land (Y), Consumer (Z)
   - By status: Filed (A), Hearing Scheduled (B), Resolved (C)
   - Average resolution time: X days

2. Governance Activities
   - Schemes searched: [count]
   - Applications submitted: [count]
   - Grievances filed: [count]
   - Grievances resolved: [count]
   - Average resolution time: X days

3. Integration Insights (THE KEY DIFFERENTIATOR)
   - Patterns detected: [count]
   - Alerts sent: [count]
   - Actions taken by Panchayats: [count]
   - Legal cases prevented: [estimated count]
   - Impact: ₹XX,XXX saved, YY families helped

4. Village-Level Dashboard (for Sarpanch)
   - My village legal cases: [count]
   - Alerts for my Panchayat: [list]
   - Pending actions: [list with deadlines]
   - Scheme applications: [count]
   - Budget utilization: X% of ₹15L

5. Analytics Charts
   - Legal cases over time (line chart)
   - Grievances by category (pie chart)
   - Pattern detection effectiveness (before/after comparison)
   - Geographic heatmap of legal cases (future: Phase 2)
```

**Technology:**
- Frontend: React + Recharts/Victory for charts
- Backend: Amazon QuickSight OR custom dashboard with DynamoDB queries
- Real-time updates: WebSocket via API Gateway

**Acceptance Criteria:**
```
Given admin logs into dashboard
When page loads
Then it should show:
  - Total cases filed: 42
  - MGNREGA cases: 15 (36%)
  - Patterns detected this month: 3
  - Alerts sent: 5
  - Actions taken: 4 (80% response rate)
  - Estimated legal cases prevented: 8
  - All data refreshes every 30 seconds
  - Charts render within 2 seconds
```

---

## 5. TECHNICAL ARCHITECTURE

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Web App (PWA)   │  │  Mobile Browser  │  │ Admin Portal  │ │
│  │  Vite + React    │  │  Responsive      │  │  Dashboard    │ │
│  │  Tailwind CSS    │  │  Touch-optimized │  │  Analytics    │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▼ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Amazon API Gateway                                       │   │
│  │  - REST API endpoints                                     │   │
│  │  - WebSocket for real-time updates                       │   │
│  │  - Request validation & rate limiting                    │   │
│  │  - CORS configuration                                     │   │
│  │  - Custom authorizer (JWT tokens)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Serverless)                │
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │  Legal Service       │  │  Governance Service  │             │
│  │  (AWS Lambda)        │  │  (AWS Lambda)        │             │
│  │  - Voice handler     │  │  - Scheme search     │             │
│  │  - Notice generator  │  │  - Budget optimizer  │             │
│  │  - Case management   │  │  - Grievance tracker │             │
│  │  Node.js 20.x        │  │  Python 3.12         │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Integration Service (AWS Lambda + Step Functions)  │        │
│  │  - Pattern detection engine                          │        │
│  │  - Cross-module triggers (EventBridge)              │        │
│  │  - Alert generation                                  │        │
│  │  Python 3.12                                         │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI/ML SERVICES LAYER                         │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐           │
│  │ Bedrock      │ │ Transcribe   │ │ Polly         │           │
│  │ Claude 3.5   │ │ Hindi/English│ │ Hindi/English │           │
│  │ Text Gen     │ │ Voice→Text   │ │ Text→Voice    │           │
│  └──────────────┘ └──────────────┘ └───────────────┘           │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │ Comprehend   │ │ SageMaker    │                             │
│  │ Entity Extract│ │ Budget Model │                             │
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐           │
│  │ DynamoDB     │ │ S3 Bucket    │ │ ElastiCache   │           │
│  │ - Users      │ │ - Voice files│ │ - Sessions    │           │
│  │ - Cases      │ │ - PDFs       │ │ - Schemes     │           │
│  │ - Schemes    │ │ - Evidence   │ │ (Redis)       │           │
│  │ - Grievances │ │ - Recordings │ │               │           │
│  └──────────────┘ └──────────────┘ └───────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  INTEGRATION & MESSAGING                         │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐           │
│  │ SNS          │ │ SQS          │ │ EventBridge   │           │
│  │ SMS alerts   │ │ Async jobs   │ │ Cross-module  │           │
│  │ Multi-channel│ │ Dead letter  │ │ events        │           │
│  └──────────────┘ └──────────────┘ └───────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MONITORING & SECURITY                           │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐           │
│  │ CloudWatch   │ │ X-Ray        │ │ IAM + KMS     │           │
│  │ Logs/Metrics │ │ Tracing      │ │ Encryption    │           │
│  └──────────────┘ └──────────────┘ └───────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack Summary

**Frontend:**
- **Framework:** Vite 5.x + React 18.x
- **Styling:** Tailwind CSS 3.x
- **State Management:** Zustand or React Context
- **HTTP Client:** Axios
- **Voice Recording:** MediaRecorder API
- **Audio Playback:** Howler.js
- **Charts:** Recharts
- **Forms:** React Hook Form
- **Icons:** Lucide React
- **PWA:** Vite PWA Plugin
- **Build Tool:** Vite
- **Package Manager:** pnpm

**Backend:**
- **Compute:** AWS Lambda (Node.js 20.x for Legal, Python 3.12 for Governance/Integration)
- **API:** Amazon API Gateway (REST + WebSocket)
- **Workflow:** AWS Step Functions (multi-step case processing)
- **Cron Jobs:** EventBridge Scheduler (pattern detection every 6 hours)

**AI/ML:**
- **LLM:** Amazon Bedrock - Claude 3.5 Sonnet
- **Voice-to-Text:** Amazon Transcribe (Hindi, English)
- **Text-to-Voice:** Amazon Polly (Aditi for Hindi, Joanna for English)
- **NLP:** Amazon Comprehend (entity extraction)
- **ML Models:** Amazon SageMaker (budget optimization - optional, can use Bedrock)

**Data Storage:**
- **Primary Database:** Amazon DynamoDB (NoSQL for flexible schema)
- **Object Storage:** Amazon S3 (voice files, PDFs, evidence photos)
- **Cache:** Amazon ElastiCache Redis (session management, scheme data)
- **Search:** Amazon OpenSearch (optional for Phase 2 - full-text search on cases)

**Integration & Messaging:**
- **SMS:** Amazon SNS (multi-provider: AWS SNS native + Twilio as backup)
- **Async Processing:** Amazon SQS (job queues, retry logic)
- **Event Bus:** Amazon EventBridge (cross-module communication)

**Monitoring & DevOps:**
- **Logging:** Amazon CloudWatch Logs
- **Metrics:** CloudWatch Metrics + Custom Dashboards
- **Tracing:** AWS X-Ray (distributed tracing)
- **Deployment:** AWS SAM (Serverless Application Model) or AWS CDK
- **CI/CD:** GitHub Actions → AWS CodePipeline
- **Infrastructure as Code:** AWS SAM templates or Terraform

**Security:**
- **Authentication:** Amazon Cognito User Pools (JWT tokens)
- **Authorization:** IAM roles + Lambda authorizers
- **Encryption:** AWS KMS (data at rest), TLS 1.3 (data in transit)
- **Secrets:** AWS Secrets Manager (API keys)
- **DDoS Protection:** AWS Shield Standard
- **WAF:** AWS WAF (optional for Phase 2)

---

## 6. FRONTEND SPECIFICATION

### 6.1 Project Setup

**Initialize Project:**
```bash
# Using pnpm (recommended for speed)
pnpm create vite integratedgov-ai --template react
cd integratedgov-ai
pnpm install

# Install dependencies
pnpm add react-router-dom zustand axios lucide-react recharts howler react-hook-form @aws-sdk/client-s3 @aws-sdk/client-cognito-identity
pnpm add -D tailwindcss postcss autoprefixer @types/node
pnpm add vite-plugin-pwa workbox-window

# Initialize Tailwind
npx tailwindcss init -p
```

**Folder Structure:**
```
src/
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── VoiceRecorder.jsx
│   │   ├── AudioPlayer.jsx
│   │   └── LoadingSpinner.jsx
│   ├── legal/
│   │   ├── VoiceComplaint.jsx
│   │   ├── LegalNoticePreview.jsx
│   │   ├── CaseList.jsx
│   │   └── EvidenceUpload.jsx
│   ├── governance/
│   │   ├── SchemeSearch.jsx
│   │   ├── BudgetPlanner.jsx
│   │   ├── GrievanceForm.jsx
│   │   └── MeetingRecorder.jsx
│   ├── integration/
│   │   ├── AlertsWidget.jsx
│   │   ├── PatternInsights.jsx
│   │   └── CrossModuleDashboard.jsx
│   └── layout/
│       ├── Header.jsx
│       ├── Sidebar.jsx
│       └── Footer.jsx
├── pages/
│   ├── Home.jsx
│   ├── Legal/
│   │   ├── FileComplaint.jsx
│   │   ├── MyCases.jsx
│   │   └── CaseDetails.jsx
│   ├── Governance/
│   │   ├── FindSchemes.jsx
│   │   ├── BudgetAllocation.jsx
│   │   ├── GrievanceTracker.jsx
│   │   └── MeetingMinutes.jsx
│   ├── Dashboard.jsx (Admin/Integration view)
│   └── Auth/
│       ├── Login.jsx
│       └── Register.jsx
├── services/
│   ├── api.js (Axios instance with interceptors)
│   ├── legalService.js (API calls for Legal module)
│   ├── governanceService.js (API calls for Governance module)
│   ├── voiceService.js (MediaRecorder wrapper)
│   ├── authService.js (Cognito integration)
│   └── storageService.js (S3 uploads)
├── store/
│   ├── authStore.js (Zustand store for auth state)
│   ├── legalStore.js (Legal module state)
│   └── governanceStore.js (Governance module state)
├── utils/
│   ├── constants.js
│   ├── validators.js
│   └── helpers.js
├── hooks/
│   ├── useVoiceRecorder.js
│   ├── useAudioPlayer.js
│   └── useGeolocation.js
├── App.jsx
├── main.jsx
└── index.css (Tailwind imports)
```

### 6.2 Key Components Specification

#### Component 1: VoiceRecorder.jsx

**Purpose:** Reusable voice recording component with waveform visualization

**Props:**
```javascript
interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // default: 300 seconds (5 min)
  language?: 'hi-IN' | 'en-IN'; // for display text
  disabled?: boolean;
}
```

**Features:**
- Start/Stop recording with visual feedback
- Real-time waveform animation
- Duration timer
- Auto-stop at max duration
- Error handling (microphone permission denied)


---

#### Component 2: SchemeSearch.jsx

**Purpose:** Voice-based scheme search with results display

**Features:**
- Voice input OR text input
- Real-time transcription display
- Scheme results with expand/collapse
- "Apply Now" CTA for each scheme
- Loading states with skeleton screens


---

### 6.3 Routing Structure


### 6.4 State Management

**Using Zustand for simplicity:**


### 6.5 API Service Layer

### 6.6 Responsive Design Guidelines

**Breakpoints (Tailwind CSS):**

**Mobile-First Approach:**
- All components designed for mobile (375px width) first
- Large tap targets (min 44x44px for buttons)
- Bottom navigation for mobile (easier thumb reach)
- Voice-first interface reduces typing on mobile

**PWA Configuration:**
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'IntegratedGov AI',
        short_name: 'IntegratedGov',
        description: 'AI-powered legal aid and governance platform for rural India',
        theme_color: '#028090',
        background_color: '#F5F5F5',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.integratedgov\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ]
});
```

---

## 7. BACKEND SPECIFICATION

### 7.1 AWS Lambda Functions Structure

**Project Organization:**
```
backend/
├── legal-service/          (Node.js 20.x)
│   ├── functions/
│   │   ├── transcribeAudio.js
│   │   ├── generateNotice.js
│   │   ├── fileComplaint.js
│   │   ├── getCases.js
│   │   └── uploadEvidence.js
│   ├── utils/
│   │   ├── bedrock.js
│   │   ├── dynamodb.js
│   │   ├── s3.js
│   │   └── templates.js
│   ├── package.json
│   └── template.yaml (SAM template)
│
├── governance-service/     (Python 3.12)
│   ├── functions/
│   │   ├── search_schemes.py
│   │   ├── optimize_budget.py
│   │   ├── file_grievance.py
│   │   └── get_grievances.py
│   ├── utils/
│   │   ├── bedrock_client.py
│   │   ├── dynamodb_client.py
│   │   ├── schemes_db.py
│   │   └── budget_optimizer.py
│   ├── requirements.txt
│   └── template.yaml
│
├── integration-service/    (Python 3.12)
│   ├── functions/
│   │   ├── pattern_detector.py (cron: every 6 hours)
│   │   ├── alert_generator.py
│   │   └── cross_module_handler.py (EventBridge triggers)
│   ├── utils/
│   │   ├── pattern_rules.py
│   │   ├── notification_service.py
│   │   └── analytics.py
│   ├── requirements.txt
│   └── template.yaml
│
├── shared/
│   ├── layers/
│   │   ├── common-nodejs/      (Shared Node.js dependencies)
│   │   └── common-python/      (Shared Python dependencies)
│   └── models/
│       ├── user.js / user.py
│       ├── case.js / case.py
│       └── grievance.js / grievance.py
│
└── infrastructure/
    ├── api-gateway.yaml
    ├── dynamodb-tables.yaml
    ├── s3-buckets.yaml
    └── eventbridge-rules.yaml
```

### 7.2 Key Lambda Functions Implementation

#### Function 1: transcribeAudio (Legal Service)

**Purpose:** Transcribe voice complaint to text

**Handler:** `legal-service/functions/transcribeAudio.js`

**Runtime:** Node.js 20.x

**Memory:** 512MB

**Timeout:** 30 seconds

**Environment Variables:**
- `TRANSCRIBE_LANGUAGE_CODE` = 'hi-IN' or 'en-IN'
- `S3_AUDIO_BUCKET` = 'integratedgov-audio-uploads'


**API Gateway Integration:**
```yaml
# api-gateway.yaml
/legal/transcribe:
  post:
    summary: Transcribe audio to text
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              audioData:
                type: string
                format: byte
                description: Base64 encoded audio
              language:
                type: string
                enum: ['hi-IN', 'en-IN']
    responses:
      200:
        description: Transcription successful
        content:
          application/json:
            schema:
              type: object
              properties:
                transcription:
                  type: string
                language:
                  type: string
                confidence:
                  type: number
```

---

#### Function 2: generateNotice (Legal Service)

**Purpose:** Generate legal notice using Amazon Bedrock

**Handler:** `legal-service/functions/generateNotice.js`

**Runtime:** Node.js 20.x

**Memory:** 1024MB (for Bedrock calls)

**Timeout:** 30 seconds

**Implementation:**

**Template Example:**
```javascript
// utils/templates.js
module.exports = {
  MGNREGA_WAGE_DISPUTE: `
LEGAL NOTICE

Date: [Current Date]

To,
The Block Development Officer
[District]
[State]

Subject: Non-payment of MGNREGA wages under Job Card No. [job_card_number]

Respected Sir/Madam,

I, [complainant_name], resident of [village], [district], [state], hereby give you notice that I have worked under the Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA) from [work_period_start] to [work_period_end] for a total of [days_worked] days under Job Card No. [job_card_number].

As per Section 3(2) of the MGNREGA Act 2005, wages must be paid within 15 days of work completion. However, an amount of ₹[amount_owed] remains unpaid for [days_overdue] days, which constitutes a violation of my statutory rights under the Act.

Under Section 3(3) of the MGNREGA Act, I am entitled to daily compensation at 0.05% of the unpaid wages for each day of delay. Therefore, in addition to the principal amount of ₹[amount_owed], I am entitled to compensation of ₹[calculated_compensation] ([days_overdue] days × 0.05% × ₹[amount_owed]).

I hereby demand:
1. Immediate payment of pending wages: ₹[amount_owed]
2. Delay compensation as per Section 3(3): ₹[calculated_compensation]
3. Total amount due: ₹[total_amount]

You are hereby given 7 days from the receipt of this notice to make the payment. Failing which, I shall be constrained to file a formal complaint under Section 27 of the MGNREGA Act before the appropriate authority and pursue all legal remedies available, including approaching the Hon'ble Court.

This notice is issued without prejudice to all my rights and contentions.

Yours sincerely,
[complainant_name]
[Digital Signature/Thumb Impression]
Place: [village]
Date: [date]
  `,
  
  LAND_DISPUTE: `... [Similar structure for land disputes] ...`,
  
  DEFAULT: `... [Generic template] ...`,
};
```

---

#### Function 3: search_schemes.py (Governance Service)

**Purpose:** Search government schemes using semantic matching

**Handler:** `governance-service/functions/search_schemes.py`

**Runtime:** Python 3.12

**Memory:** 1024MB

**Timeout:** 15 seconds

**Implementation:**
```python
# search_schemes.py
import json
import boto3
import os
from utils.bedrock_client import invoke_bedrock
from utils.schemes_db import get_all_schemes, SCHEMES_DATABASE

dynamodb = boto3.resource('dynamodb')
schemes_table = dynamodb.Table(os.environ['SCHEMES_TABLE'])

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        query = body['query']
        language = body.get('language', 'hi-IN')
        
        # Step 1: Get all schemes from database (in prototype, use hardcoded list)
        schemes = get_all_schemes()
        
        # Step 2: Use Bedrock for semantic matching
        prompt = build_semantic_search_prompt(query, schemes, language)
        bedrock_response = invoke_bedrock(prompt, max_tokens=1500)
        
        # Step 3: Parse Bedrock response (expects JSON with ranked scheme IDs)
        matched_schemes = parse_bedrock_response(bedrock_response, schemes)
        
        # Step 4: Translate scheme details if needed
        if language == 'hi-IN':
            matched_schemes = translate_schemes_to_hindi(matched_schemes)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'schemes': matched_schemes[:3],  # Return top 3
                'total_found': len(matched_schemes),
            }, ensure_ascii=False)
        }
        
    except Exception as e:
        print(f'Scheme search error: {e}')
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Scheme search failed', 'details': str(e)})
        }

def build_semantic_search_prompt(query, schemes, language):
    schemes_list = "\n".join([
        f"{i+1}. {s['name']} - {s['description']} (Category: {s['category']}, Eligibility: {s['eligibility_short']})"
        for i, s in enumerate(schemes)
    ])
    
    lang_name = "Hindi" if language == 'hi-IN' else "English"
    
    return f"""You are an expert in Indian government schemes helping rural citizens find relevant schemes.

User Query (in {lang_name}): "{query}"

Available Schemes:
{schemes_list}

Task:
1. Understand the user's need from their query (e.g., water problem, education, agriculture)
2. Match the query semantically to the most relevant schemes
3. Rank schemes by relevance (1 = most relevant)
4. Return ONLY a JSON array of scheme IDs in order of relevance

Output Format (JSON only, no explanation):
[1, 5, 10]

Where numbers are the scheme IDs from the list above. Return top 5 matches.
"""

def parse_bedrock_response(bedrock_text, schemes):
    # Extract JSON from Bedrock response
    import re
    json_match = re.search(r'\[[\d,\s]+\]', bedrock_text)
    if not json_match:
        # Fallback: return first 3 schemes
        return schemes[:3]
    
    scheme_indices = json.loads(json_match.group())
    matched_schemes = [schemes[idx-1] for idx in scheme_indices if 0 < idx <= len(schemes)]
    
    return matched_schemes

def translate_schemes_to_hindi(schemes):
    # For prototype, use pre-translated Hindi descriptions
    # In production, call Amazon Translate or include Hindi in database
    hindi_translations = {
        'PM-KISAN': 'पीएम-किसान: ₹6,000/वर्ष सीधे किसानों को',
        'MGNREGA': 'मनरेगा: 100 दिन गारंटीशुदा रोजगार',
        # ... more translations
    }
    
    for scheme in schemes:
        if scheme['id'] in hindi_translations:
            scheme['name'] = hindi_translations[scheme['id']]
    
    return schemes

# utils/schemes_db.py
SCHEMES_DATABASE = [
    {
        'id': 'PM_KISAN',
        'name': 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
        'description': 'Direct cash transfer of ₹6,000 per year to farmer families in three installments',
        'category': 'Agriculture',
        'benefit': '₹6,000/year',
        'eligibility': 'All landholding farmer families',
        'eligibility_short': 'Landholding farmers',
        'application_process': '1. Register on PM-KISAN portal (pmkisan.gov.in), 2. Provide Aadhaar, bank account, land records, 3. Verification by local authorities',
        'documents': ['Aadhaar Card', 'Bank Account Details', 'Land Ownership Documents'],
    },
    {
        'id': 'MGNREGA',
        'name': 'Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)',
        'description': 'Provides 100 days of guaranteed wage employment in a financial year to rural households',
        'category': 'Employment',
        'benefit': '100 days employment at ₹200-300/day',
        'eligibility': 'Any rural household willing to do unskilled manual work',
        'eligibility_short': 'All rural households',
        'application_process': '1. Apply at Gram Panchayat office, 2. Get Job Card within 15 days, 3. Request work when needed',
        'documents': ['Aadhaar Card', 'Address Proof', 'Passport Size Photo'],
    },
    # ... add remaining 18 schemes
]

def get_all_schemes():
    return SCHEMES_DATABASE
```

---

#### Function 4: pattern_detector.py (Integration Service)

**Purpose:** Detect patterns in legal cases and trigger governance alerts (runs every 6 hours)

**Handler:** `integration-service/functions/pattern_detector.py`

**Runtime:** Python 3.12

**Memory:** 512MB

**Timeout:** 60 seconds (needs time to query all cases)

**Trigger:** EventBridge Rule (cron: 0 */6 * * * - every 6 hours)


---

### 7.3 DynamoDB Table Schemas

#### Table 1: LegalCases

```yaml
TableName: IntegratedGov-LegalCases
BillingMode: PAY_PER_REQUEST
KeySchema:
  - AttributeName: case_id
    KeyType: HASH
Attributes:
  - AttributeName: case_id
    AttributeType: S
  - AttributeName: user_id
    AttributeType: S
  - AttributeName: created_at
    AttributeType: S
  - AttributeName: panchayat_id
    AttributeType: S
GlobalSecondaryIndexes:
  - IndexName: UserIdIndex
    KeySchema:
      - AttributeName: user_id
        KeyType: HASH
      - AttributeName: created_at
        KeyType: RANGE
    Projection:
      ProjectionType: ALL
  - IndexName: PanchayatIdIndex
    KeySchema:
      - AttributeName: panchayat_id
        KeyType: HASH
      - AttributeName: created_at
        KeyType: RANGE
    Projection:
      ProjectionType: ALL

# Sample Item:
{
  "case_id": "LC/2026/12345",
  "user_id": "USER-abc123",
  "case_type": "MGNREGA_WAGE_DISPUTE",
  "status": "FILED",
  "complainant_name": "Ramesh Kumar",
  "village": "Kareli",
  "district": "Sitapur",
  "state": "Uttar Pradesh",
  "panchayat_id": "UP-ST-KARELI",
  "amount_owed": 4500.00,
  "days_worked": 62,
  "job_card_number": "UP-01-234-567",
  "legal_notice": "LEGAL NOTICE\n\nDate: 2026-01-15...",
  "language": "hi-IN",
  "evidence_urls": [
    "https://s3.amazonaws.com/integratedgov/evidence/case123-photo1.jpg"
  ],
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-15T10:30:00Z",
  "filed_at": "2026-01-15T11:00:00Z",
  "hearing_date": null,
  "resolution_date": null,
}
```

#### Table 2: GovernanceSchemes

```yaml
TableName: IntegratedGov-Schemes
BillingMode: PAY_PER_REQUEST
KeySchema:
  - AttributeName: scheme_id
    KeyType: HASH
Attributes:
  - AttributeName: scheme_id
    AttributeType: S

# Sample Item:
{
  "scheme_id": "PM_KISAN",
  "name_en": "Pradhan Mantri Kisan Samman Nidhi",
  "name_hi": "प्रधानमंत्री किसान सम्मान निधि",
  "description_en": "Direct cash transfer of ₹6,000 per year...",
  "description_hi": "₹6,000 प्रति वर्ष की सीधी नकद राशि...",
  "category": "AGRICULTURE",
  "benefit_amount": 6000,
  "eligibility_en": "All landholding farmer families",
  "eligibility_hi": "सभी भूमिधारक किसान परिवार",
  "documents": ["Aadhaar", "Bank Account", "Land Records"],
  "application_url": "https://pmkisan.gov.in",
  "level": "CENTRAL",
  "state": null,
  "keywords": ["farmer", "cash", "agriculture", "किसान", "कृषि"],
  "updated_at": "2026-01-01T00:00:00Z"
}
```

#### Table 3: Grievances

```yaml
TableName: IntegratedGov-Grievances
BillingMode: PAY_PER_REQUEST
KeySchema:
  - AttributeName: grievance_id
    KeyType: HASH
Attributes:
  - AttributeName: grievance_id
    AttributeType: S
  - AttributeName: panchayat_id
    AttributeType: S
  - AttributeName: status
    AttributeType: S
  - AttributeName: created_at
    AttributeType: S
GlobalSecondaryIndexes:
  - IndexName: PanchayatStatusIndex
    KeySchema:
      - AttributeName: panchayat_id
        KeyType: HASH
      - AttributeName: status
        KeyType: RANGE
    Projection:
      ProjectionType: ALL

# Sample Item:
{
  "grievance_id": "GR/2026/54321",
  "user_id": "USER-xyz789",
  "panchayat_id": "UP-ST-KARELI",
  "category": "INFRASTRUCTURE",
  "subcategory": "ROADS",
  "description": "गांव की मुख्य सड़क टूटी है",
  "description_en": "Main village road is broken",
  "gps_latitude": 27.4321,
  "gps_longitude": 80.1234,
  "photo_urls": ["https://s3..."],
  "status": "ASSIGNED",
  "assigned_to": "USER-ward123",
  "assigned_at": "2026-01-15T12:00:00Z",
  "created_at": "2026-01-15T11:30:00Z",
  "updated_at": "2026-01-15T12:00:00Z",
  "resolved_at": null,
  "resolution_notes": null,
}
```

#### Table 4: Users

```yaml
TableName: IntegratedGov-Users
BillingMode: PAY_PER_REQUEST
KeySchema:
  - AttributeName: user_id
    KeyType: HASH
Attributes:
  - AttributeName: user_id
    AttributeType: S
  - AttributeName: phone_number
    AttributeType: S
GlobalSecondaryIndexes:
  - IndexName: PhoneNumberIndex
    KeySchema:
      - AttributeName: phone_number
        KeyType: HASH
    Projection:
      ProjectionType: ALL

# Sample Item:
{
  "user_id": "USER-abc123",
  "phone_number": "+919876543210",
  "name": "Ramesh Kumar",
  "role": "CITIZEN",
  "village": "Kareli",
  "district": "Sitapur",
  "state": "Uttar Pradesh",
  "panchayat_id": "UP-ST-KARELI",
  "language_preference": "hi-IN",
  "created_at": "2026-01-01T00:00:00Z",
  "last_login": "2026-01-15T10:00:00Z",
}
```

#### Table 5: Panchayats

```yaml
TableName: IntegratedGov-Panchayats
BillingMode: PAY_PER_REQUEST
KeySchema:
  - AttributeName: panchayat_id
    KeyType: HASH

# Sample Item:
{
  "panchayat_id": "UP-ST-KARELI",
  "name": "Kareli Gram Panchayat",
  "district": "Sitapur",
  "state": "Uttar Pradesh",
  "sarpanch_name": "Sunita Devi",
  "sarpanch_phone": "+919812345678",
  "sarpanch_user_id": "USER-sarpanch001",
  "population": 1200,
  "annual_budget": 1500000,
  "infrastructure_status": {
    "roads": "POOR",
    "water": "AVERAGE",
    "education": "GOOD",
    "health": "AVERAGE"
  },
  "created_at": "2026-01-01T00:00:00Z",
}
```

#### Table 6: Alerts

```yaml
TableName: IntegratedGov-Alerts
BillingMode: PAY_PER_REQUEST
KeySchema:
  - AttributeName: alert_id
    KeyType: HASH
Attributes:
  - AttributeName: pattern_type
    AttributeType: S
  - AttributeName: detected_at
    AttributeType: S
GlobalSecondaryIndexes:
  - IndexName: PatternTypeIndex
    KeySchema:
      - AttributeName: pattern_type
        KeyType: HASH
      - AttributeName: detected_at
        KeyType: RANGE
    Projection:
      ProjectionType: ALL

# Sample Item:
{
  "alert_id": "ALT-20260115-MGNREGA",
  "pattern_type": "MGNREGA_WAGE_DISPUTE_CLUSTER",
  "panchayat_id": "UP-ST-KARELI",
  "case_count": 5,
  "case_ids": ["LC/2026/12345", "LC/2026/12346", ...],
  "total_amount_pending": 24500.00,
  "priority": "HIGH",
  "action_required": "Contact BDO for payment release",
  "status": "SENT",
  "notified_users": ["USER-sarpanch001"],
  "detected_at": "2026-01-15T18:00:00Z",
  "resolved_at": null,
}
```

---

### 7.4 API Gateway Endpoints

```yaml
# api-gateway.yaml
openapi: 3.0.0
info:
  title: IntegratedGov AI API
  version: 1.0.0
  description: Unified API for Legal Aid and Governance modules

servers:
  - url: https://api.integratedgov.com/v1

paths:
  # Authentication
  /auth/register:
    post:
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone_number:
                  type: string
                name:
                  type: string
                village:
                  type: string
                district:
                  type: string
                role:
                  type: string
                  enum: [CITIZEN, SARPANCH, ADMIN]
      responses:
        201:
          description: User registered successfully
  
  /auth/login:
    post:
      summary: Login user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                phone_number:
                  type: string
                otp:
                  type: string
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    type: object

  # Legal Module
  /legal/transcribe:
    post:
      summary: Transcribe voice complaint
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                audioData:
                  type: string
                  format: byte
                language:
                  type: string
                  enum: [hi-IN, en-IN]
      responses:
        200:
          description: Transcription successful

  /legal/generate-notice:
    post:
      summary: Generate legal notice using AI
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ComplaintData'
      responses:
        200:
          description: Notice generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  case_id:
                    type: string
                  legal_notice:
                    type: string

  /legal/cases:
    get:
      summary: Get user's legal cases
      security:
        - BearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [DRAFT, FILED, HEARING_SCHEDULED, RESOLVED]
      responses:
        200:
          description: List of cases

    post:
      summary: File a new legal complaint
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ComplaintData'
      responses:
        201:
          description: Case filed successfully

  /legal/cases/{caseId}:
    get:
      summary: Get case details
      security:
        - BearerAuth: []
      parameters:
        - name: caseId
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Case details

  /legal/cases/{caseId}/evidence:
    post:
      summary: Upload evidence for case
      security:
        - BearerAuth: []
      parameters:
        - name: caseId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                evidence:
                  type: array
                  items:
                    type: string
                    format: binary
      responses:
        200:
          description: Evidence uploaded

  # Governance Module
  /governance/schemes/search:
    post:
      summary: Search government schemes
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
                language:
                  type: string
                  enum: [hi-IN, en-IN]
      responses:
        200:
          description: Matching schemes
          content:
            application/json:
              schema:
                type: object
                properties:
                  schemes:
                    type: array
                    items:
                      $ref: '#/components/schemas/Scheme'

  /governance/budget/optimize:
    post:
      summary: Optimize budget allocation using AI
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                total_budget:
                  type: number
                priorities:
                  type: object
                infrastructure_status:
                  type: object
                village_data:
                  type: object
      responses:
        200:
          description: Optimized budget allocation

  /governance/grievances:
    get:
      summary: Get grievances (for Panchayat members)
      security:
        - BearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
        - name: category
          in: query
          schema:
            type: string
      responses:
        200:
          description: List of grievances

    post:
      summary: File a new grievance
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content: