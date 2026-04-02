import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Check if already seeded
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@firm.com' },
    })

    if (existingUser) {
      return NextResponse.json({ message: 'Already seeded' }, { status: 200 })
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('password123', 12)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@firm.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'admin',
      },
    })

    // Create milestones
    const milestones = await Promise.all([
      prisma.milestone.create({
        data: {
          title: 'Q1 Financial Review',
          description: 'Quarterly review of financial goals and portfolio performance',
          dayOfYear: 15,
          color: '#3B82F6',
        },
      }),
      prisma.milestone.create({
        data: {
          title: 'Mid-Year Assessment',
          description: 'Comprehensive mid-year financial health check',
          dayOfYear: 100,
          color: '#8B5CF6',
        },
      }),
      prisma.milestone.create({
        data: {
          title: 'Q3 Strategy Update',
          description: 'Third quarter strategy review and adjustments',
          dayOfYear: 200,
          color: '#F59E0B',
        },
      }),
      prisma.milestone.create({
        data: {
          title: 'Year-End Planning',
          description: 'Annual tax planning and year-end financial strategy',
          dayOfYear: 320,
          color: '#10B981',
        },
      }),
    ])

    // Create check-ins for each milestone
    const checkInsData = [
      // Q1 Check-ins
      { title: 'Portfolio Review Call', description: 'Review current portfolio allocation', dayOfYear: 10, milestoneId: milestones[0].id },
      { title: 'Goal Setting Session', description: 'Establish financial goals for the year', dayOfYear: 15, milestoneId: milestones[0].id },
      { title: 'Risk Assessment', description: 'Evaluate risk tolerance and exposure', dayOfYear: 25, milestoneId: milestones[0].id },
      // Mid-Year Check-ins
      { title: 'Performance Analysis', description: 'Analyze portfolio performance vs benchmarks', dayOfYear: 90, milestoneId: milestones[1].id },
      { title: 'Rebalancing Review', description: 'Determine if portfolio rebalancing is needed', dayOfYear: 100, milestoneId: milestones[1].id },
      { title: 'Life Events Check', description: 'Review any significant life events impacting finances', dayOfYear: 115, milestoneId: milestones[1].id },
      // Q3 Check-ins
      { title: 'Market Update', description: 'Discuss current market conditions and outlook', dayOfYear: 190, milestoneId: milestones[2].id },
      { title: 'Tax Loss Harvesting', description: 'Identify tax loss harvesting opportunities', dayOfYear: 200, milestoneId: milestones[2].id },
      { title: 'Estate Planning Review', description: 'Review and update estate planning documents', dayOfYear: 215, milestoneId: milestones[2].id },
      // Year-End Check-ins
      { title: 'Year-End Tax Review', description: 'Final tax optimization strategies', dayOfYear: 315, milestoneId: milestones[3].id },
      { title: 'RMD Planning', description: 'Required Minimum Distribution planning', dayOfYear: 320, milestoneId: milestones[3].id },
      { title: 'New Year Planning', description: 'Set strategy and goals for next year', dayOfYear: 350, milestoneId: milestones[3].id },
    ]

    const checkIns = await Promise.all(
      checkInsData.map((ci) => prisma.checkIn.create({ data: ci }))
    )

    // Create tasks for each check-in
    const tasksData = [
      // Portfolio Review Call tasks
      { title: 'Send portfolio statement', description: 'Email latest portfolio statement to client', checkInId: checkIns[0].id },
      { title: 'Prepare performance report', description: 'Generate YTD performance analysis', checkInId: checkIns[0].id },
      { title: 'Schedule call', description: 'Book 45-min call on calendar', checkInId: checkIns[0].id },
      // Goal Setting tasks
      { title: 'Review prior year goals', description: 'Pull up last year\'s goal document', checkInId: checkIns[1].id },
      { title: 'Update financial plan', description: 'Revise financial plan with new goals', checkInId: checkIns[1].id },
      { title: 'Document goals', description: 'Record agreed goals in CRM', checkInId: checkIns[1].id },
      { title: 'Send goals summary', description: 'Email goals summary to client', checkInId: checkIns[1].id },
      // Risk Assessment tasks
      { title: 'Send risk questionnaire', description: 'Email risk tolerance questionnaire', checkInId: checkIns[2].id },
      { title: 'Review responses', description: 'Analyze questionnaire responses', checkInId: checkIns[2].id },
      { title: 'Adjust allocation if needed', description: 'Recommend allocation changes based on risk profile', checkInId: checkIns[2].id },
      // Performance Analysis tasks
      { title: 'Pull performance data', description: 'Generate H1 performance report', checkInId: checkIns[3].id },
      { title: 'Compare to benchmarks', description: 'Compare performance vs S&P, bond index', checkInId: checkIns[3].id },
      { title: 'Prepare presentation', description: 'Create client-friendly performance slides', checkInId: checkIns[3].id },
      // Rebalancing tasks
      { title: 'Calculate drift', description: 'Calculate drift from target allocation', checkInId: checkIns[4].id },
      { title: 'Identify trades', description: 'Identify rebalancing trades needed', checkInId: checkIns[4].id },
      { title: 'Execute rebalancing', description: 'Execute approved rebalancing trades', checkInId: checkIns[4].id },
      // Life Events tasks
      { title: 'Review beneficiary designations', description: 'Confirm all beneficiaries are up to date', checkInId: checkIns[5].id },
      { title: 'Check insurance coverage', description: 'Review life/disability insurance adequacy', checkInId: checkIns[5].id },
      { title: 'Update emergency fund', description: 'Confirm 6-month emergency fund maintained', checkInId: checkIns[5].id },
      // Market Update tasks
      { title: 'Prepare market summary', description: 'Create Q3 market summary document', checkInId: checkIns[6].id },
      { title: 'Review economic indicators', description: 'Analyze key economic data points', checkInId: checkIns[6].id },
      // Tax Loss Harvesting tasks
      { title: 'Identify loss positions', description: 'Screen for tax loss harvesting candidates', checkInId: checkIns[7].id },
      { title: 'Check wash sale rules', description: 'Ensure compliance with wash sale rules', checkInId: checkIns[7].id },
      { title: 'Execute tax trades', description: 'Execute approved tax loss harvesting trades', checkInId: checkIns[7].id },
      { title: 'Document savings', description: 'Calculate and document estimated tax savings', checkInId: checkIns[7].id },
      // Estate Planning tasks
      { title: 'Review will & trust', description: 'Confirm will and trust documents are current', checkInId: checkIns[8].id },
      { title: 'Review POA documents', description: 'Confirm power of attorney documents', checkInId: checkIns[8].id },
      { title: 'Update beneficiary forms', description: 'Update all account beneficiary designations', checkInId: checkIns[8].id },
      // Year-End Tax tasks
      { title: 'Maximize retirement contributions', description: 'Ensure 401k/IRA contributions maximized', checkInId: checkIns[9].id },
      { title: 'Consider Roth conversion', description: 'Evaluate Roth conversion opportunity', checkInId: checkIns[9].id },
      { title: 'Review charitable giving', description: 'Optimize charitable giving strategy', checkInId: checkIns[9].id },
      // RMD tasks
      { title: 'Calculate RMD amount', description: 'Calculate required minimum distribution', checkInId: checkIns[10].id },
      { title: 'Schedule RMD distribution', description: 'Ensure RMD taken before Dec 31', checkInId: checkIns[10].id },
      { title: 'Review QCD options', description: 'Consider qualified charitable distributions', checkInId: checkIns[10].id },
      // New Year Planning tasks
      { title: 'Draft investment policy', description: 'Update investment policy statement', checkInId: checkIns[11].id },
      { title: 'Set next year milestones', description: 'Schedule all check-ins for next year', checkInId: checkIns[11].id },
      { title: 'Send year-end summary', description: 'Email comprehensive year-end report', checkInId: checkIns[11].id },
      { title: 'Collect feedback', description: 'Send client satisfaction survey', checkInId: checkIns[11].id },
    ]

    const tasks = await Promise.all(
      tasksData.map((t) => prisma.task.create({ data: t }))
    )

    // Create demo clients with varying progress
    const clientsData = [
      { name: 'Sarah Johnson', email: 'sarah.j@example.com', phone: '555-0101', color: '#10B981', startDayOfYear: 1 },
      { name: 'Michael Chen', email: 'm.chen@example.com', phone: '555-0102', color: '#3B82F6', startDayOfYear: 1 },
      { name: 'Patricia Williams', email: 'p.williams@example.com', phone: '555-0103', color: '#8B5CF6', startDayOfYear: 1 },
      { name: 'Robert Martinez', email: 'r.martinez@example.com', phone: '555-0104', color: '#F59E0B', startDayOfYear: 1 },
      { name: 'Jennifer Davis', email: 'j.davis@example.com', phone: '555-0105', color: '#EF4444', startDayOfYear: 1 },
      { name: 'William Thompson', email: 'w.thompson@example.com', phone: '555-0106', color: '#06B6D4', startDayOfYear: 1 },
      { name: 'Elizabeth Garcia', email: 'e.garcia@example.com', phone: '555-0107', color: '#84CC16', startDayOfYear: 1 },
      { name: 'David Wilson', email: 'd.wilson@example.com', phone: '555-0108', color: '#F97316', startDayOfYear: 1 },
    ]

    const clients = await Promise.all(
      clientsData.map((c) =>
        prisma.client.create({
          data: { ...c, advisorId: admin.id },
        })
      )
    )

    // Create client check-ins and tasks with varying progress
    // Today is approximately day 92 of the year (April 2)
    const today = new Date()
    const todayDayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)

    // Helper to create check-in records
    const createClientCheckIns = async (
      clientId: string,
      completedUpToDay: number
    ) => {
      for (const ci of checkIns) {
        const isCompleted = ci.dayOfYear <= completedUpToDay
        await prisma.clientCheckIn.create({
          data: {
            clientId,
            checkInId: ci.id,
            status: isCompleted ? 'completed' : 'pending',
            completedAt: isCompleted ? new Date() : null,
          },
        })
      }
    }

    const createClientTasks = async (
      clientId: string,
      completedUpToDay: number
    ) => {
      for (const t of tasks) {
        // Find which check-in this task belongs to
        const checkIn = checkIns.find((ci) => ci.id === t.checkInId)
        const isCompleted = checkIn && checkIn.dayOfYear <= completedUpToDay
        await prisma.clientTask.create({
          data: {
            clientId,
            taskId: t.id,
            status: isCompleted ? 'completed' : 'pending',
            completedAt: isCompleted ? new Date() : null,
          },
        })
      }
    }

    // Sarah - on track (completed up to day 100)
    await createClientCheckIns(clients[0].id, 100)
    await createClientTasks(clients[0].id, 100)

    // Michael - ahead (completed up to day 130)
    await createClientCheckIns(clients[1].id, 130)
    await createClientTasks(clients[1].id, 130)

    // Patricia - slightly behind (completed up to day 60)
    await createClientCheckIns(clients[2].id, 60)
    await createClientTasks(clients[2].id, 60)

    // Robert - significantly behind (completed up to day 25)
    await createClientCheckIns(clients[3].id, 25)
    await createClientTasks(clients[3].id, 25)

    // Jennifer - on track (completed up to day 95)
    await createClientCheckIns(clients[4].id, 95)
    await createClientTasks(clients[4].id, 95)

    // William - very behind (only Q1 start done)
    await createClientCheckIns(clients[5].id, 10)
    await createClientTasks(clients[5].id, 10)

    // Elizabeth - on track (completed up to day 90)
    await createClientCheckIns(clients[6].id, 90)
    await createClientTasks(clients[6].id, 90)

    // David - ahead (completed up to day 115)
    await createClientCheckIns(clients[7].id, 115)
    await createClientTasks(clients[7].id, 115)

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully',
      data: {
        users: 1,
        milestones: milestones.length,
        checkIns: checkIns.length,
        tasks: tasks.length,
        clients: clients.length,
        todayDayOfYear,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed data', details: String(error) },
      { status: 500 }
    )
  }
}
