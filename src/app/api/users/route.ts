import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, email, password } = body

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim(), password: hashed, role: 'advisor' },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}
