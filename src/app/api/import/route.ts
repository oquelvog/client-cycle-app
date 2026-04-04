import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** GET /api/import — returns the CSV template as a downloadable file */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const csv = [
    'Household Name,Review Cycle,Starting Milestone',
    'Johnson Family,Annual Review,Q1 Review',
    'Smith Household,Annual Review,Q2 Review',
    'Williams Family,Quarterly Check-in,Month 1',
  ].join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="annua-import-template.csv"',
    },
  })
}

/** Simple CSV row parser — handles quoted fields */
function parseCSV(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => {
      const row: string[] = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          inQuote = !inQuote
        } else if (ch === ',' && !inQuote) {
          row.push(cur.trim())
          cur = ''
        } else {
          cur += ch
        }
      }
      row.push(cur.trim())
      return row
    })
}

/** POST /api/import — uploads CSV or XLSX, creates households */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  let rows: string[][] = []

  if (ext === 'xlsx' || ext === 'xls') {
    // Parse Excel using xlsx library (loaded dynamically to keep bundle light)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_csv(ws)
      rows = parseCSV(data)
    } catch {
      return NextResponse.json({ error: 'Failed to parse Excel file. Try saving as CSV.' }, { status: 400 })
    }
  } else {
    const text = await file.text()
    rows = parseCSV(text)
  }

  if (rows.length < 2) {
    return NextResponse.json({ error: 'File appears empty or has no data rows' }, { status: 400 })
  }

  // Find header row (skip it)
  const dataRows = rows.slice(1)

  // Load existing cycles and milestones for this advisor
  const cycles = await prisma.reviewCycle.findMany({
    where: { advisorId: session.user.id },
    include: { milestones: true },
  })
  const allTasks = await prisma.task.findMany()
  const allCheckIns = await prisma.checkIn.findMany()

  const created: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  for (const row of dataRows) {
    const [householdName, cycleName, milestoneName] = row
    if (!householdName) continue

    // Match review cycle by name (case-insensitive)
    const cycle = cycleName
      ? cycles.find(c => c.name.toLowerCase() === cycleName.trim().toLowerCase())
      : null

    if (cycleName && !cycle) {
      errors.push(`"${householdName}": review cycle "${cycleName}" not found — create it first`)
      continue
    }

    // Match milestone within that cycle (or globally if no cycle)
    let milestone = null
    if (milestoneName) {
      const cycleMs = cycle ? cycle.milestones : []
      milestone = cycleMs.find(m => m.title.toLowerCase() === milestoneName.trim().toLowerCase())
        ?? null
    }

    // Check for duplicate household name for this advisor
    const existing = await prisma.client.findFirst({
      where: { advisorId: session.user.id, name: { equals: householdName, mode: 'insensitive' } },
    })
    if (existing) {
      skipped.push(householdName)
      continue
    }

    await prisma.client.create({
      data: {
        name: householdName,
        advisorId: session.user.id,
        reviewCycleId: cycle?.id ?? null,
        currentMilestoneId: milestone?.id ?? null,
        clientCheckIns: { create: allCheckIns.map(ci => ({ checkInId: ci.id, status: 'pending' })) },
        clientTasks: { create: allTasks.map(t => ({ taskId: t.id, status: 'pending' })) },
      },
    })
    created.push(householdName)
  }

  return NextResponse.json({ created: created.length, skipped: skipped.length, errors })
}
