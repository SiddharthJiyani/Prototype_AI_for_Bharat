import { Router } from 'express'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' })
const transcribe = new TranscribeClient({ region: process.env.AWS_REGION || 'ap-south-1' })

const LANGUAGE_CODES = {
  hi: 'hi-IN',
  en: 'en-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
}

/** POST /api/voice/transcribe — transcribe audio from uploaded file */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    const language = req.body.language || 'hi'
    const bucketName = process.env.S3_BUCKET || 'intgov-documents-dev'
    const jobName = `transcribe-${uuidv4()}`
    const s3Key = `audio/${jobName}.wav`

    // Upload audio to S3
    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: 'audio/wav',
      }))
    } catch (s3Err) {
      console.warn('S3 upload warning:', s3Err.message)
      // Continue even if S3 fails for demo
    }

    // Try AWS Transcribe, fall back to mock if service unavailable
    let transcript = null
    let isDemo = false

    try {
      // Start transcription job
      const s3Uri = `s3://${bucketName}/${s3Key}`
      await transcribe.send(new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        Media: { MediaFileUri: s3Uri },
        LanguageCode: LANGUAGE_CODES[language] || 'en-IN',
        OutputBucketName: bucketName,
      }))

      // Poll for completion (max 30 seconds)
      let attempts = 0
      const maxAttempts = 30

      while (!transcript && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000))

        const result = await transcribe.send(new GetTranscriptionJobCommand({
          TranscriptionJobName: jobName,
        }))

        if (result.TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
          const transcriptFile = result.TranscriptionJob.Transcript.TranscriptFileUri
          const response = await fetch(transcriptFile)
          const json = await response.json()
          transcript = json.results.transcripts[0].transcript
        } else if (result.TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
          console.warn('Transcribe job failed, using demo mode')
          throw new Error(result.TranscriptionJob.FailureReason)
        }
        attempts++
      }
    } catch (transcribeErr) {
      console.warn('Transcribe service unavailable, using demo mode:', transcribeErr.message)
      isDemo = true
      
      // Mock transcript based on language
      if (language === 'hi') {
        transcript = 'मुझे MGNREGA की मजदूरी 2 महीने से नहीं मिली है। मैंने जनवरी और फरवरी में 60 दिन का काम किया लेकिन ₹4,500 की राशि अभी तक खाते में नहीं आई।'
      } else {
        transcript = 'I have not received my MGNREGA wages for the past 2 months. I worked in January and February for 60 days but the amount of ₹4,500 has not been credited to my account.'
      }
    }

    if (!transcript) {
      return res.status(408).json({ error: 'Transcription timeout - please try again' })
    }

    return res.json({
      transcript,
      language,
      jobName,
      duration: '2.5',
      isDemo, // Flag indicating if this is mock data
    })
  } catch (err) {
    console.error('Voice transcribe error:', err)
    return res.status(500).json({
      error: err.message || 'Transcription service error',
      isDemo: true, // Indicate demo mode on error
    })
  }
})

export default router
