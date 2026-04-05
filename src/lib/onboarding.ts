import { prisma } from '@/lib/prisma'

export async function createOnboardingCycles(advisorId: string): Promise<void> {
  const quarters = {
    Q1: { dayOfYear: 1, endDayOfYear: 90, durationType: 'quarter' },
    Q2: { dayOfYear: 91, endDayOfYear: 181, durationType: 'quarter' },
    Q3: { dayOfYear: 182, endDayOfYear: 273, durationType: 'quarter' },
    Q4: { dayOfYear: 274, endDayOfYear: 365, durationType: 'quarter' },
  }

  // ── Cycle 1: Annual Review ────────────────────────────────────────────────
  const cycle1 = await prisma.reviewCycle.create({
    data: { advisorId, name: 'Annual Review' },
  })

  const cycle1M_Q4 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle1.id,
      title: 'Annual Review Meeting',
      color: '#3B82F6',
      ...quarters.Q4,
    },
  })

  const cycle1CI_Q4 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle1M_Q4.id,
      title: cycle1M_Q4.title,
      dayOfYear: quarters.Q4.dayOfYear,
    },
  })

  const cycle1Tasks_Q4 = await Promise.all([
    'Send pre-meeting agenda',
    'Review investment policy statement',
    'Rebalance portfolio',
    'Review tax planning opportunities',
    'Update goals and priorities',
    'Hold annual review meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle1CI_Q4.id, title } })))

  const cycle1Client = await prisma.client.create({
    data: {
      advisorId,
      reviewCycleId: cycle1.id,
      currentMilestoneId: cycle1M_Q4.id,
      cycleYear: 2026,
      name: 'The Johnson Family',
      color: '#3B82F6',
    },
  })

  await prisma.clientCheckIn.create({
    data: { clientId: cycle1Client.id, checkInId: cycle1CI_Q4.id, status: 'pending' },
  })

  for (const task of cycle1Tasks_Q4) {
    await prisma.clientTask.create({
      data: { clientId: cycle1Client.id, taskId: task.id, status: 'pending' },
    })
  }

  // ── Cycle 2: Semi-Annual Review ───────────────────────────────────────────
  const cycle2 = await prisma.reviewCycle.create({
    data: { advisorId, name: 'Semi-Annual Review' },
  })

  const cycle2M_Q2 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle2.id,
      title: 'Spring Review Meeting',
      color: '#8B5CF6',
      ...quarters.Q2,
    },
  })

  const cycle2M_Q4 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle2.id,
      title: 'Fall Review Meeting',
      color: '#8B5CF6',
      ...quarters.Q4,
    },
  })

  const cycle2CI_Q2 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle2M_Q2.id,
      title: cycle2M_Q2.title,
      dayOfYear: quarters.Q2.dayOfYear,
    },
  })

  const cycle2CI_Q4 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle2M_Q4.id,
      title: cycle2M_Q4.title,
      dayOfYear: quarters.Q4.dayOfYear,
    },
  })

  const cycle2Tasks_Q2 = await Promise.all([
    'Send pre-meeting agenda',
    'Review portfolio performance',
    'Mid-year tax planning check',
    'Hold spring meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle2CI_Q2.id, title } })))

  const cycle2Tasks_Q4 = await Promise.all([
    'Send pre-meeting agenda',
    'Review investment policy statement',
    'Rebalance portfolio',
    'Year-end tax planning',
    'Hold fall meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle2CI_Q4.id, title } })))

  const cycle2Client = await prisma.client.create({
    data: {
      advisorId,
      reviewCycleId: cycle2.id,
      currentMilestoneId: cycle2M_Q2.id,
      cycleYear: 2026,
      name: 'The Martinez Family',
      color: '#8B5CF6',
    },
  })

  for (const ci of [cycle2CI_Q2, cycle2CI_Q4]) {
    await prisma.clientCheckIn.create({
      data: { clientId: cycle2Client.id, checkInId: ci.id, status: 'pending' },
    })
  }

  for (const task of [...cycle2Tasks_Q2, ...cycle2Tasks_Q4]) {
    await prisma.clientTask.create({
      data: { clientId: cycle2Client.id, taskId: task.id, status: 'pending' },
    })
  }

  // ── Cycle 3: Tri-Annual Review ────────────────────────────────────────────
  const cycle3 = await prisma.reviewCycle.create({
    data: { advisorId, name: 'Tri-Annual Review' },
  })

  const cycle3M_Q1 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle3.id,
      title: 'Winter Check-In',
      color: '#10B981',
      ...quarters.Q1,
    },
  })

  const cycle3M_Q2 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle3.id,
      title: 'Mid-Year Review',
      color: '#10B981',
      ...quarters.Q2,
    },
  })

  const cycle3M_Q4 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle3.id,
      title: 'Year-End Planning',
      color: '#10B981',
      ...quarters.Q4,
    },
  })

  const cycle3CI_Q1 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle3M_Q1.id,
      title: cycle3M_Q1.title,
      dayOfYear: quarters.Q1.dayOfYear,
    },
  })

  const cycle3CI_Q2 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle3M_Q2.id,
      title: cycle3M_Q2.title,
      dayOfYear: quarters.Q2.dayOfYear,
    },
  })

  const cycle3CI_Q4 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle3M_Q4.id,
      title: cycle3M_Q4.title,
      dayOfYear: quarters.Q4.dayOfYear,
    },
  })

  const cycle3Tasks_Q1 = await Promise.all([
    'Send check-in email',
    'Review January tax documents',
    'Confirm investment allocations',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle3CI_Q1.id, title } })))

  const cycle3Tasks_Q2 = await Promise.all([
    'Send pre-meeting agenda',
    'Mid-year tax planning check',
    'Portfolio performance review',
    'Hold mid-year meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle3CI_Q2.id, title } })))

  const cycle3Tasks_Q4 = await Promise.all([
    'Review investment policy statement',
    'Rebalance portfolio',
    'Year-end tax moves',
    'Hold year-end meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle3CI_Q4.id, title } })))

  const cycle3Client = await prisma.client.create({
    data: {
      advisorId,
      reviewCycleId: cycle3.id,
      currentMilestoneId: cycle3M_Q2.id,
      cycleYear: 2026,
      name: 'The Anderson Family',
      color: '#10B981',
    },
  })

  for (const ci of [cycle3CI_Q1, cycle3CI_Q2, cycle3CI_Q4]) {
    await prisma.clientCheckIn.create({
      data: { clientId: cycle3Client.id, checkInId: ci.id, status: 'pending' },
    })
  }

  for (const task of [...cycle3Tasks_Q1, ...cycle3Tasks_Q2, ...cycle3Tasks_Q4]) {
    await prisma.clientTask.create({
      data: { clientId: cycle3Client.id, taskId: task.id, status: 'pending' },
    })
  }

  // ── Cycle 4: Quarterly Review ─────────────────────────────────────────────
  const cycle4 = await prisma.reviewCycle.create({
    data: { advisorId, name: 'Quarterly Review' },
  })

  const cycle4M_Q1 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle4.id,
      title: 'Q1 Review Meeting',
      color: '#F59E0B',
      ...quarters.Q1,
    },
  })

  const cycle4M_Q2 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle4.id,
      title: 'Q2 Review Meeting',
      color: '#F59E0B',
      ...quarters.Q2,
    },
  })

  const cycle4M_Q3 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle4.id,
      title: 'Q3 Review Meeting',
      color: '#F59E0B',
      ...quarters.Q3,
    },
  })

  const cycle4M_Q4 = await prisma.milestone.create({
    data: {
      reviewCycleId: cycle4.id,
      title: 'Q4 Review Meeting',
      color: '#F59E0B',
      ...quarters.Q4,
    },
  })

  const cycle4CI_Q1 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle4M_Q1.id,
      title: cycle4M_Q1.title,
      dayOfYear: quarters.Q1.dayOfYear,
    },
  })

  const cycle4CI_Q2 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle4M_Q2.id,
      title: cycle4M_Q2.title,
      dayOfYear: quarters.Q2.dayOfYear,
    },
  })

  const cycle4CI_Q3 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle4M_Q3.id,
      title: cycle4M_Q3.title,
      dayOfYear: quarters.Q3.dayOfYear,
    },
  })

  const cycle4CI_Q4 = await prisma.checkIn.create({
    data: {
      milestoneId: cycle4M_Q4.id,
      title: cycle4M_Q4.title,
      dayOfYear: quarters.Q4.dayOfYear,
    },
  })

  const cycle4Tasks_Q1 = await Promise.all([
    'Send pre-meeting agenda',
    'Review portfolio performance',
    'Quarterly tax check',
    'Hold Q1 meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle4CI_Q1.id, title } })))

  const cycle4Tasks_Q2 = await Promise.all([
    'Send pre-meeting agenda',
    'Review portfolio performance',
    'Quarterly tax check',
    'Hold Q2 meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle4CI_Q2.id, title } })))

  const cycle4Tasks_Q3 = await Promise.all([
    'Send pre-meeting agenda',
    'Review portfolio performance',
    'Quarterly tax check',
    'Hold Q3 meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle4CI_Q3.id, title } })))

  const cycle4Tasks_Q4 = await Promise.all([
    'Send pre-meeting agenda',
    'Review investment policy statement',
    'Rebalance portfolio',
    'Year-end tax planning',
    'Hold Q4 meeting',
    'Send follow-up summary',
  ].map((title) => prisma.task.create({ data: { checkInId: cycle4CI_Q4.id, title } })))

  const cycle4Client = await prisma.client.create({
    data: {
      advisorId,
      reviewCycleId: cycle4.id,
      currentMilestoneId: cycle4M_Q2.id,
      cycleYear: 2026,
      name: 'The Williams Family',
      color: '#F59E0B',
    },
  })

  for (const ci of [cycle4CI_Q1, cycle4CI_Q2, cycle4CI_Q3, cycle4CI_Q4]) {
    await prisma.clientCheckIn.create({
      data: { clientId: cycle4Client.id, checkInId: ci.id, status: 'pending' },
    })
  }

  for (const task of [...cycle4Tasks_Q1, ...cycle4Tasks_Q2, ...cycle4Tasks_Q3, ...cycle4Tasks_Q4]) {
    await prisma.clientTask.create({
      data: { clientId: cycle4Client.id, taskId: task.id, status: 'pending' },
    })
  }
}
