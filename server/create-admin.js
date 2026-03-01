/**
 * One-time script to create an admin user.
 * Usage:  node create-admin.js <email> <password> [name]
 * Example: node create-admin.js admin@example.com MyPassword123 "Admin User"
 */

import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import bcrypt from 'bcryptjs'
import { dynamo, TABLES } from './config/dynamodb.js'

const [,, email, password, name = 'Admin'] = process.argv

if (!email || !password) {
  console.error('Usage: node create-admin.js <email> <password> [name]')
  process.exit(1)
}

const passwordHash = await bcrypt.hash(password, 10)
const now = new Date().toISOString()

// Check if user already exists
const existing = await dynamo.send(
  new GetCommand({ TableName: TABLES.USERS, Key: { PK: `USER#${email}`, SK: 'PROFILE' } })
)

if (existing.Item) {
  // Update role to admin if already exists
  const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb')
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { PK: `USER#${email}`, SK: 'PROFILE' },
      UpdateExpression: 'SET #r = :r',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':r': 'admin' },
    })
  )
  console.log(`✅ Existing user "${email}" updated to role: admin`)
  process.exit(0)
}

await dynamo.send(
  new PutCommand({
    TableName: TABLES.USERS,
    Item: {
      PK: `USER#${email}`,
      SK: 'PROFILE',
      userId: email,
      name,
      email,
      phone: '',
      passwordHash,
      role: 'admin',
      createdAt: now,
    },
  })
)

console.log(`✅ Admin account created:  ${email}  (role: admin)`)
process.exit(0)
