/**
 * One-time script to create all required DynamoDB tables.
 * Run with: node server/setup-tables.js
 */
import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import dotenv from 'dotenv'
dotenv.config()

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const TABLES = [
  {
    TableName: process.env.TABLE_USERS || 'intgov-users',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
  },
  {
    TableName: process.env.TABLE_CASES || 'intgov-cases',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
  },
  {
    TableName: process.env.TABLE_GRIEVANCES || 'intgov-grievances',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
  },
  {
    TableName: process.env.TABLE_BUDGET || 'intgov-budget',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
  },
  {
    TableName: process.env.TABLE_SCHEMES || 'intgov-schemes',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
  },
  {
    TableName: process.env.TABLE_ALERTS || 'intgov-integration-alerts',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
  },
  {
    TableName: process.env.TABLE_MEETINGS || 'intgov-meetings',
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
  },
]

async function setup() {
  // List existing tables
  const { TableNames: existing } = await client.send(new ListTablesCommand({}))
  console.log('Existing tables:', existing?.join(', ') || '(none)')

  for (const table of TABLES) {
    if (existing?.includes(table.TableName)) {
      console.log(`✓ ${table.TableName} already exists`)
      continue
    }

    try {
      await client.send(new CreateTableCommand({
        ...table,
        BillingMode: 'PAY_PER_REQUEST', // on-demand, no provisioned capacity needed
      }))
      console.log(`✓ Created ${table.TableName}`)
    } catch (err) {
      if (err.name === 'ResourceInUseException') {
        console.log(`✓ ${table.TableName} already exists`)
      } else {
        console.error(`✗ Failed to create ${table.TableName}:`, err.message)
      }
    }
  }

  console.log('\nDone! All tables ready.')
}

setup().catch(console.error)
