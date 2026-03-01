import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import dotenv from 'dotenv'

// Must load .env BEFORE reading process.env for credentials
dotenv.config()

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

// Table names (from env with defaults)
export const TABLES = {
  USERS: process.env.TABLE_USERS || 'intgov-users',
  CASES: process.env.TABLE_CASES || 'intgov-cases',
  GRIEVANCES: process.env.TABLE_GRIEVANCES || 'intgov-grievances',
  BUDGET: process.env.TABLE_BUDGET || 'intgov-budget',
  SCHEMES: process.env.TABLE_SCHEMES || 'intgov-schemes',
  ALERTS: process.env.TABLE_ALERTS || 'intgov-integration-alerts',
  MEETINGS: process.env.TABLE_MEETINGS || 'intgov-meetings',
}
