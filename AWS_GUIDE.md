Here is the **AWS Setup Guide** formatted for maximum clarity while retaining every detail from your original text.

---

# AWS Setup Guide: Step-by-Step to Get All Credentials & Resources

## PART 1: Create AWS Account & Get Access Keys

### Step 1.1: Create AWS Account

1. Go to **aws.amazon.com**
2. Click **"Create an AWS Account"**
3. Enter email, password, AWS account name (e.g., `"IntegratedGov-Dev"`)
4. Add payment method (required, free tier covers most of this)
5. Verify phone number
6. Choose **Basic Support Plan** (free) or **Developer Support** (paid, optional)

### Step 1.2: Create IAM User with Programmatic Access

1. Sign in to AWS Console → **aws.amazon.com**
2. Go to **IAM** (Identity & Access Management) service
3. Left sidebar → Click **"Users"**
4. Click **"Create user"** button (top right)
* **User name:** `integratedgov-dev`


5. Click **"Next"**
6. Under **"Set permissions"** → Select **"Attach policies directly"**
7. Search & attach these policies:
* ✅ `AmazonDynamoDBFullAccess`
* ✅ `AmazonS3FullAccess`
* ✅ `AmazonBedrockFullAccess`
* ✅ `AmazonTranscribeFullAccess`
* ✅ `AmazonPollyFullAccess`
* ✅ `CloudWatchLogsFullAccess`


8. Click **"Next"** → **"Create user"**

### Step 1.3: Generate Access Key & Secret

1. Go to **IAM** → **Users** → Click on your new user `integratedgov-dev`
2. Click **"Security credentials"** tab
3. Scroll to **"Access keys"** section → Click **"Create access key"**
4. Select **"Command Line Interface (CLI)"** → Check ✅ **"I understand..."** → Click **"Next"**
5. **IMPORTANT:** Copy both:
* **Access Key ID** → paste into `server/.env` & `ai-service/.env` as `AWS_ACCESS_KEY_ID`
* **Secret Access Key** → paste into `server/.env` & `ai-service/.env` as `AWS_SECRET_ACCESS_KEY`


6. Click **"Done"**

---

## PART 2: Create DynamoDB Tables

### Step 2.1: Navigate to DynamoDB

1. AWS Console → Search **"DynamoDB"** → Click service
2. Left sidebar → Click **"Tables"**
3. Click **"Create table"** button

### Step 2.2: Create 6 Tables (Repeat 6 times)

| Table Name | Partition Key (String) | Sort Key (String) |
| --- | --- | --- |
| **intgov-users** | `userId` | (none) |
| **intgov-cases** | `caseId` | `createdAt` |
| **intgov-grievances** | `grievanceId` | `createdAt` |
| **intgov-budget** | `panchayatId` | `year` |
| **intgov-schemes** | `schemeId` | (none) |
| **intgov-integration-alerts** | `alertId` | `createdAt` |

* **Billing:** Select **Pay-per-request** for all tables.
* Click **"Create table"** → Wait 1 min for creation after each.

---

## PART 3: Create S3 Bucket (for audio/documents)

### Step 3.1: Navigate to S3

1. AWS Console → Search **"S3"** → Click service
2. Click **"Create bucket"** button

### Step 3.2: Create Bucket

1. **Bucket name:** `intgov-documents-dev-dev` (must be globally unique, add `-dev` or your account ID)
2. **AWS Region:** `ap-south-1` (Mumbai — closest to India)
3. **Public Access:** Keep ✅ **"Block all public access"** (secure)
4. Scroll down → Click **"Create bucket"**

### Step 3.3: Add Bucket Name to .env

* Copy bucket name → paste into `ai-service/.env` as `S3_BUCKET`

---

## PART 4: Enable Bedrock Access

### Step 4.1: Request Model Access

1. AWS Console → Search **"Bedrock"** → Click service
2. Left sidebar → Click **"Model access"**
3. Click **"Manage model access"** button (top right)
4. Find **"Claude 3.5 Sonnet"** by Anthropic → Click the checkbox ✅ to enable
5. Scroll down → Click **"Save changes"**
6. Wait 2-3 minutes for access to be granted ⏳

### Step 4.2: Note the Model ID

* **Model ID in dashboard:** `anthropic.claude-3-5-sonnet-20241022-v2:0`
* Add to `ai-service/.env` as `BEDROCK_MODEL_ID`

---

## PART 5: Verify Region & Finalize .env Files

### Step 5.1: Confirm Region

1. AWS Console → Top right → Click region dropdown → Select **"Asia Pacific (Mumbai) ap-south-1"**
2. Add to both `.env` files: `AWS_REGION=ap-south-1`

### Step 5.2: Fill Both .env Files

**server/.env:**

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1

```

**ai-service/.env:**

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET=intgov-documents-dev-dev
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

```

---

## PART 6: Test Connection from CLI (Optional)

Open PowerShell and run:

```powershell
aws sts get-caller-identity

```

If you see your account info → ✅ **Credentials work!**

---

## PART 7: Cost Expectations (Free Tier)

| Service | Free Tier | Cost After |
| --- | --- | --- |
| **DynamoDB** | 25GB storage + 25 W/R units | $0.25 per million requests |
| **S3** | 5GB storage | $0.023/GB |
| **Bedrock** | $0 — pay per token | $0.003 per 1K tokens (input) |
| **Transcribe** | 250 minutes/month | $0.024 per minute |
| **Polly** | 1M chars/month | $4.00 per 1M chars |

**Total for prototype:** ~$50–100/month if you hit all services heavily.

---

You're now ready to run:

```bash
npm run dev  # (Server)
uvicorn main:app --reload  # (AI Service)

```

All AWS services will be accessible from your Express server and FastAPI service! 🚀

