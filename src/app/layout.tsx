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
        <title>Annua</title>
        <meta name="description" content="Annual client engagement cycle management" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
