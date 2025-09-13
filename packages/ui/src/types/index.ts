export interface CronxInstance {
  workerId: string
  isRunning: boolean
  storage: string
}

export interface JobStats {
  totalJobs: number
  activeJobs: number
  pausedJobs: number
  workerId: string
  isRunning: boolean
  totalRuns?: number
  successfulRuns?: number
  failedRuns?: number
  averageDuration?: number
}

export interface Job {
  name: string
  schedule: string
  paused: boolean
  nextRun?: string | null  // ISO string from API
  lastRun?: string | null  // ISO string from API
  retries: number
  timeout: number
  backoff: 'fixed' | 'exponential'
}

export interface JobRun {
  id: string
  jobName: string
  startedAt: Date
  completedAt?: Date
  status: 'running' | 'completed' | 'failed'
  result?: any
  error?: string
  duration?: number
  attempt: number
}