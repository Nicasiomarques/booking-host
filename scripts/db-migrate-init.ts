import dotenv from 'dotenv'
import { execSync } from 'child_process'
import { resolve } from 'path'

// Try to load .env.test first, fallback to .env
const envTestPath = resolve(process.cwd(), '.env.test')
const envPath = resolve(process.cwd(), '.env')

try {
  dotenv.config({ path: envTestPath })
} catch {
  try {
    dotenv.config({ path: envPath })
  } catch {
    dotenv.config()
  }
}

// Fallback if still not loaded
if (!process.env.DATABASE_URL) {
  dotenv.config()
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required but not found in environment variables')
  console.error('Please create a .env.test or .env file with DATABASE_URL')
  process.exit(1)
}

try {
  const prismaDir = resolve(process.cwd(), 'src/adapters/outbound/prisma')
  
  console.log('📝 Creating initial migration...')
  
  execSync(`npx prisma migrate dev --name init --config=${prismaDir}/prisma.config.ts`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    cwd: prismaDir,
  })
  
  console.log('✅ Migration created successfully!')
} catch (error) {
  console.error('❌ Failed to create migration')
  process.exit(1)
}

