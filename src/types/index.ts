export type DurationType = "specific_date" | "month" | "quarter";
export type TaskStatus = "pending" | "completed";

export interface ReviewCycle {
  id: string;
  name: string;
  advisorId: string;
  milestones: Milestone[];
  clients?: Client[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dayOfYear: number;
  endDayOfYear: number;
  durationType: DurationType;
  color: string;
  order: number;
  reviewCycleId: string;
  checkIns: CheckIn[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckIn {
  id: string;
  title: string;
  description: string | null;
  dayOfYear: number;
  milestoneId: string;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  checkInId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  color: string;
  tags: string[];
  notes: string | null;
  lastContacted: Date | null;
  cycleYear: number;
  reviewCycleId: string;
  reviewCycle?: ReviewCycle;
  currentMilestoneId: string | null;
  currentMilestone?: Milestone | null;
  advisorId: string;
  clientTasks?: ClientTask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientTask {
  id: string;
  clientId: string;
  taskId: string;
  task?: Task;
  status: TaskStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientCheckIn {
  id: string;
  clientId: string;
  checkInId: string;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCompletionStats {
  total: number;
  completed: number;
}
