'use client'

import { SessionProvider } from 'next-auth/react'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Client Engagement Timeline</title>
        <meta name="description" content="Financial advisor client engagement timeline management" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
