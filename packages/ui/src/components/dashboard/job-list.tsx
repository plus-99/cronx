'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Job } from "@/types"
import { formatRelativeTime } from "@/lib/utils"

interface JobListProps {
  jobs: Job[]
  onPauseJob: (name: string) => void
  onResumeJob: (name: string) => void
  onRunJob: (name: string) => void
  onDeleteJob: (name: string) => void
  loading?: boolean
}

export function JobList({ 
  jobs, 
  onPauseJob, 
  onResumeJob, 
  onRunJob, 
  onDeleteJob,
  loading 
}: JobListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAction = async (action: () => void, jobName: string) => {
    setActionLoading(jobName)
    try {
      await action()
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading jobs...</div>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            No jobs scheduled. Create your first job to get started.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs ({jobs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.name} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{job.name}</h3>
                  <Badge variant={job.paused ? "secondary" : "success"}>
                    {job.paused ? "Paused" : "Active"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Schedule: <code className="bg-muted px-1 rounded">{job.schedule}</code>
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {job.nextRun && (
                    <span>Next: {formatRelativeTime(new Date(job.nextRun))}</span>
                  )}
                  {job.lastRun && (
                    <span>Last: {formatRelativeTime(new Date(job.lastRun))}</span>
                  )}
                  <span>Retries: {job.retries}</span>
                  <span>Timeout: {job.timeout}ms</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(() => onRunJob(job.name), job.name)}
                  disabled={actionLoading === job.name}
                >
                  Run Now
                </Button>
                
                {job.paused ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(() => onResumeJob(job.name), job.name)}
                    disabled={actionLoading === job.name}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(() => onPauseJob(job.name), job.name)}
                    disabled={actionLoading === job.name}
                  >
                    Pause
                  </Button>
                )}
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleAction(() => onDeleteJob(job.name), job.name)}
                  disabled={actionLoading === job.name}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}