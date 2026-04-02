import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean up existing data
  await prisma.clientTask.deleteMany()
  await prisma.clientCheckIn.deleteMany()
  await prisma.task.deleteMany()
  await prisma.checkIn.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()

  // Create admin user
  const adminPassword = await bcrypt.hash('password123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@firm.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
    },
  })

  // Create an advisor user
  const advisorPassword = await bcrypt.hash('password123', 10)
  const advisor = await prisma.user.create({
    data: {
      email: 'advisor@firm.com',
      name: 'Sarah Johnson',
      password: advisorPassword,
      role: 'advisor',
    },
  })

  console.log('Created users:', admin.email, advisor.email)

  // Create milestones
  const milestone1 = await prisma.milestone.create({
    data: {
      title: 'Q1 Annual Review',
      description: 'First quarter review - financial goals assessment and portfolio review',
      dayOfYear: 15,
      color: '#3B82F6',
    },
  })

  const milestone2 = await prisma.milestone.create({
    data: {
      title: 'Mid-Year Review',
      description: 'Semi-annual check - progress towards goals and strategy adjustments',
      dayOfYear: 100,
      color: '#8B5CF6',
    },
  })

  const milestone3 = await prisma.milestone.create({
    data: {
      title: 'Q3 Portfolio Rebalance',
      description: 'Third quarter rebalancing and tax planning preparation',
      dayOfYear: 200,
      color: '#F59E0B',
    },
  })

  const milestone4 = await prisma.milestone.create({
    data: {
      title: 'Year-End Planning',
      description: 'Annual wrap-up, tax loss harvesting, and next year goal setting',
      dayOfYear: 320,
      color: '#EF4444',
    },
  })

  console.log('Created milestones')

  // Create check-ins for milestone 1 (Q1)
  const checkin1_1 = await prisma.checkIn.create({
    data: {
      title: 'Initial Goals Meeting',
      description: 'Set financial goals for the year',
      dayOfYear: 10,
      milestoneId: milestone1.id,
    },
  })

  const checkin1_2 = await prisma.checkIn.create({
    data: {
      title: 'Portfolio Review',
      description: 'Review current portfolio allocation',
      dayOfYear: 20,
      milestoneId: milestone1.id,
    },
  })

  const checkin1_3 = await prisma.checkIn.create({
    data: {
      title: 'Risk Assessment',
      description: 'Update risk tolerance questionnaire',
      dayOfYear: 30,
      milestoneId: milestone1.id,
    },
  })

  // Create check-ins for milestone 2 (Mid-Year)
  const checkin2_1 = await prisma.checkIn.create({
    data: {
      title: 'Progress Check',
      description: 'Review progress towards annual goals',
      dayOfYear: 90,
      milestoneId: milestone2.id,
    },
  })

  const checkin2_2 = await prisma.checkIn.create({
    data: {
      title: 'Investment Strategy Review',
      description: 'Adjust investment strategy based on market conditions',
      dayOfYear: 110,
      milestoneId: milestone2.id,
    },
  })

  const checkin2_3 = await prisma.checkIn.create({
    data: {
      title: 'Insurance Review',
      description: 'Review life, disability, and property insurance coverage',
      dayOfYear: 120,
      milestoneId: milestone2.id,
    },
  })

  // Create check-ins for milestone 3 (Q3)
  const checkin3_1 = await prisma.checkIn.create({
    data: {
      title: 'Portfolio Rebalancing',
      description: 'Rebalance portfolio to target allocation',
      dayOfYear: 190,
      milestoneId: milestone3.id,
    },
  })

  const checkin3_2 = await prisma.checkIn.create({
    data: {
      title: 'Tax Planning Preview',
      description: 'Preliminary tax planning and estimated payments',
      dayOfYear: 210,
      milestoneId: milestone3.id,
    },
  })

  // Create check-ins for milestone 4 (Year-End)
  const checkin4_1 = await prisma.checkIn.create({
    data: {
      title: 'Tax Loss Harvesting',
      description: 'Identify and execute tax loss harvesting opportunities',
      dayOfYear: 310,
      milestoneId: milestone4.id,
    },
  })

  const checkin4_2 = await prisma.checkIn.create({
    data: {
      title: 'Year-End Wrap Up',
      description: 'Final review and next year planning',
      dayOfYear: 330,
      milestoneId: milestone4.id,
    },
  })

  const checkin4_3 = await prisma.checkIn.create({
    data: {
      title: 'Next Year Goals',
      description: 'Set goals and strategy for the coming year',
      dayOfYear: 350,
      milestoneId: milestone4.id,
    },
  })

  console.log('Created check-ins')

  // Create tasks for each check-in
  // Check-in 1.1 tasks
  const task1_1_1 = await prisma.task.create({ data: { title: 'Review prior year performance', checkInId: checkin1_1.id } })
  const task1_1_2 = await prisma.task.create({ data: { title: 'Document current financial situation', checkInId: checkin1_1.id } })
  const task1_1_3 = await prisma.task.create({ data: { title: 'Set SMART financial goals', checkInId: checkin1_1.id } })
  const task1_1_4 = await prisma.task.create({ data: { title: 'Create action plan timeline', checkInId: checkin1_1.id } })

  // Check-in 1.2 tasks
  const task1_2_1 = await prisma.task.create({ data: { title: 'Review current holdings', checkInId: checkin1_2.id } })
  const task1_2_2 = await prisma.task.create({ data: { title: 'Assess allocation vs targets', checkInId: checkin1_2.id } })
  const task1_2_3 = await prisma.task.create({ data: { title: 'Identify underperforming assets', checkInId: checkin1_2.id } })

  // Check-in 1.3 tasks
  const task1_3_1 = await prisma.task.create({ data: { title: 'Complete risk questionnaire', checkInId: checkin1_3.id } })
  const task1_3_2 = await prisma.task.create({ data: { title: 'Review risk tolerance changes', checkInId: checkin1_3.id } })
  const task1_3_3 = await prisma.task.create({ data: { title: 'Adjust portfolio risk if needed', checkInId: checkin1_3.id } })
  const task1_3_4 = await prisma.task.create({ data: { title: 'Document risk profile update', checkInId: checkin1_3.id } })
  const task1_3_5 = await prisma.task.create({ data: { title: 'Sign updated IPS if changed', checkInId: checkin1_3.id } })

  // Check-in 2.1 tasks
  const task2_1_1 = await prisma.task.create({ data: { title: 'Compare performance to benchmarks', checkInId: checkin2_1.id } })
  const task2_1_2 = await prisma.task.create({ data: { title: 'Review savings rate progress', checkInId: checkin2_1.id } })
  const task2_1_3 = await prisma.task.create({ data: { title: 'Assess debt reduction progress', checkInId: checkin2_1.id } })

  // Check-in 2.2 tasks
  const task2_2_1 = await prisma.task.create({ data: { title: 'Review market conditions', checkInId: checkin2_2.id } })
  const task2_2_2 = await prisma.task.create({ data: { title: 'Consider sector reallocation', checkInId: checkin2_2.id } })
  const task2_2_3 = await prisma.task.create({ data: { title: 'Review international exposure', checkInId: checkin2_2.id } })
  const task2_2_4 = await prisma.task.create({ data: { title: 'Document strategy changes', checkInId: checkin2_2.id } })

  // Check-in 2.3 tasks
  const task2_3_1 = await prisma.task.create({ data: { title: 'Review life insurance coverage', checkInId: checkin2_3.id } })
  const task2_3_2 = await prisma.task.create({ data: { title: 'Review disability coverage', checkInId: checkin2_3.id } })
  const task2_3_3 = await prisma.task.create({ data: { title: 'Review property insurance', checkInId: checkin2_3.id } })

  // Check-in 3.1 tasks
  const task3_1_1 = await prisma.task.create({ data: { title: 'Calculate current allocation', checkInId: checkin3_1.id } })
  const task3_1_2 = await prisma.task.create({ data: { title: 'Execute rebalancing trades', checkInId: checkin3_1.id } })
  const task3_1_3 = await prisma.task.create({ data: { title: 'Document rebalancing rationale', checkInId: checkin3_1.id } })
  const task3_1_4 = await prisma.task.create({ data: { title: 'Update IPS if strategy changed', checkInId: checkin3_1.id } })

  // Check-in 3.2 tasks
  const task3_2_1 = await prisma.task.create({ data: { title: 'Estimate year-end tax liability', checkInId: checkin3_2.id } })
  const task3_2_2 = await prisma.task.create({ data: { title: 'Identify harvesting opportunities', checkInId: checkin3_2.id } })
  const task3_2_3 = await prisma.task.create({ data: { title: 'Review quarterly tax payments', checkInId: checkin3_2.id } })

  // Check-in 4.1 tasks
  const task4_1_1 = await prisma.task.create({ data: { title: 'Identify loss positions', checkInId: checkin4_1.id } })
  const task4_1_2 = await prisma.task.create({ data: { title: 'Execute harvesting trades', checkInId: checkin4_1.id } })
  const task4_1_3 = await prisma.task.create({ data: { title: 'Maximize retirement contributions', checkInId: checkin4_1.id } })
  const task4_1_4 = await prisma.task.create({ data: { title: 'Consider Roth conversion', checkInId: checkin4_1.id } })

  // Check-in 4.2 tasks
  const task4_2_1 = await prisma.task.create({ data: { title: 'Review year-end statements', checkInId: checkin4_2.id } })
  const task4_2_2 = await prisma.task.create({ data: { title: 'Prepare tax documents checklist', checkInId: checkin4_2.id } })
  const task4_2_3 = await prisma.task.create({ data: { title: 'Schedule tax professional meeting', checkInId: checkin4_2.id } })

  // Check-in 4.3 tasks
  const task4_3_1 = await prisma.task.create({ data: { title: 'Draft next year goals', checkInId: checkin4_3.id } })
  const task4_3_2 = await prisma.task.create({ data: { title: 'Set new contribution targets', checkInId: checkin4_3.id } })
  const task4_3_3 = await prisma.task.create({ data: { title: 'Schedule Q1 meeting', checkInId: checkin4_3.id } })
  const task4_3_4 = await prisma.task.create({ data: { title: 'Send year-end summary letter', checkInId: checkin4_3.id } })

  console.log('Created tasks')

  // Create 8 demo clients with varying progress
  const clientColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316']

  const clients = [
    {
      name: 'Robert Chen',
      email: 'rchen@email.com',
      phone: '555-0101',
      color: clientColors[0],
      tags: '#10B981,#3B82F6',
      startDayOfYear: 1,
      // Ahead: completed through check-in 2.2 (day 110)
      completedCheckIns: [checkin1_1.id, checkin1_2.id, checkin1_3.id, checkin2_1.id, checkin2_2.id],
    },
    {
      name: 'Margaret Williams',
      email: 'mwilliams@email.com',
      phone: '555-0102',
      color: clientColors[1],
      tags: '#3B82F6',
      startDayOfYear: 1,
      // On track: completed through check-in 1.3 (day 30) - current date ~day 92
      completedCheckIns: [checkin1_1.id, checkin1_2.id, checkin1_3.id],
    },
    {
      name: 'James Patterson',
      email: 'jpatterson@email.com',
      phone: '555-0103',
      color: clientColors[2],
      tags: '#8B5CF6,#EF4444',
      startDayOfYear: 1,
      // Behind: only completed check-in 1.1 (day 10)
      completedCheckIns: [checkin1_1.id],
    },
    {
      name: 'Lisa Martinez',
      email: 'lmartinez@email.com',
      phone: '555-0104',
      color: clientColors[3],
      tags: '#F59E0B',
      startDayOfYear: 1,
      // On track: completed through check-in 2.1 (day 90)
      completedCheckIns: [checkin1_1.id, checkin1_2.id, checkin1_3.id, checkin2_1.id],
    },
    {
      name: 'David Thompson',
      email: 'dthompson@email.com',
      phone: '555-0105',
      color: clientColors[4],
      tags: '#EF4444',
      startDayOfYear: 1,
      // Very behind: no completed check-ins
      completedCheckIns: [],
    },
    {
      name: 'Jennifer Adams',
      email: 'jadams@email.com',
      phone: '555-0106',
      color: clientColors[5],
      tags: '#EC4899,#10B981',
      startDayOfYear: 1,
      // Behind: completed check-in 1.1 and 1.2
      completedCheckIns: [checkin1_1.id, checkin1_2.id],
    },
    {
      name: 'Michael Torres',
      email: 'mtorres@email.com',
      phone: '555-0107',
      color: clientColors[6],
      tags: '#14B8A6',
      startDayOfYear: 1,
      // Ahead: completed through Q3 check-ins (day 210)
      completedCheckIns: [checkin1_1.id, checkin1_2.id, checkin1_3.id, checkin2_1.id, checkin2_2.id, checkin2_3.id, checkin3_1.id, checkin3_2.id],
    },
    {
      name: 'Sarah Kim',
      email: 'skim@email.com',
      phone: '555-0108',
      color: clientColors[7],
      tags: '#F97316,#3B82F6',
      startDayOfYear: 1,
      // On track: completed through check-in 1.3 (day 30)
      completedCheckIns: [checkin1_1.id, checkin1_2.id, checkin1_3.id],
    },
  ]

  const allCheckIns = [
    checkin1_1, checkin1_2, checkin1_3,
    checkin2_1, checkin2_2, checkin2_3,
    checkin3_1, checkin3_2,
    checkin4_1, checkin4_2, checkin4_3,
  ]

  const allTasks: Record<string, any[]> = {
    [checkin1_1.id]: [task1_1_1, task1_1_2, task1_1_3, task1_1_4],
    [checkin1_2.id]: [task1_2_1, task1_2_2, task1_2_3],
    [checkin1_3.id]: [task1_3_1, task1_3_2, task1_3_3, task1_3_4, task1_3_5],
    [checkin2_1.id]: [task2_1_1, task2_1_2, task2_1_3],
    [checkin2_2.id]: [task2_2_1, task2_2_2, task2_2_3, task2_2_4],
    [checkin2_3.id]: [task2_3_1, task2_3_2, task2_3_3],
    [checkin3_1.id]: [task3_1_1, task3_1_2, task3_1_3, task3_1_4],
    [checkin3_2.id]: [task3_2_1, task3_2_2, task3_2_3],
    [checkin4_1.id]: [task4_1_1, task4_1_2, task4_1_3, task4_1_4],
    [checkin4_2.id]: [task4_2_1, task4_2_2, task4_2_3],
    [checkin4_3.id]: [task4_3_1, task4_3_2, task4_3_3, task4_3_4],
  }

  for (const clientData of clients) {
    const { completedCheckIns, ...clientFields } = clientData
    const client = await prisma.client.create({
      data: {
        ...clientFields,
        advisorId: advisor.id,
        notes: `Demo notes for ${clientFields.name}`,
      },
    })

    // Create client check-ins
    for (const checkIn of allCheckIns) {
      const isCompleted = completedCheckIns.includes(checkIn.id)
      await prisma.clientCheckIn.create({
        data: {
          clientId: client.id,
          checkInId: checkIn.id,
          status: isCompleted ? 'completed' : 'pending',
          completedAt: isCompleted ? new Date() : null,
        },
      })
    }

    // Create client tasks
    for (const checkIn of allCheckIns) {
      const tasks = allTasks[checkIn.id] || []
      const isCheckInCompleted = completedCheckIns.includes(checkIn.id)
      for (const task of tasks) {
        await prisma.clientTask.create({
          data: {
            clientId: client.id,
            taskId: task.id,
            status: isCheckInCompleted ? 'completed' : 'pending',
            completedAt: isCheckInCompleted ? new Date() : null,
          },
        })
      }
    }

    console.log(`Created client: ${client.name}`)
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
