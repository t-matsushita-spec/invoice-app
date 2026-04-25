// Server Component wrapper for dynamic rendering
// Config exports must be at top level, not inside 'use client' components

export const dynamic = 'force-dynamic'
export const revalidate = 0

import SignupPageClient from './SignupPageClient'

export default function SignupPage() {
  return <SignupPageClient />
}
