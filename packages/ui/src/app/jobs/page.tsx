'use client'

import { useState, useEffect } from 'react'
import { CreateJobForm } from '@/components/dashboard/create-job-form'
import { JobList } from '@/components/dashboard/job-list'
import { Job } from '@/types'

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch('/api/jobs')
      if (!res.ok) throw new Error('Failed to fetch jobs')
      
      const jobsData = await res.json()
      setJobs(jobsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePauseJob = async (name: string) => {
    try {
      const res = await fetch(`/api/jobs/${name}/pause`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to pause job')
      await fetchJobs()
    } catch (err) {
      console.error('Error pausing job:', err)
    }
  }

  const handleResumeJob = async (name: string) => {
    try {
      const res = await fetch(`/api/jobs/${name}/resume`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to resume job')
      await fetchJobs()
    } catch (err) {
      console.error('Error resuming job:', err)
    }
  }

  const handleRunJob = async (name: string) => {
    try {
      const res = await fetch(`/api/jobs/${name}/run`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to run job')
      setTimeout(fetchJobs, 1000)
    } catch (err) {
      console.error('Error running job:', err)
    }
  }

  const handleDeleteJob = async (name: string) => {
    if (!confirm(`Are you sure you want to delete job "${name}"?`)) {
      return
    }
    
    try {
      const res = await fetch(`/api/jobs/${name}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete job')
      await fetchJobs()
    } catch (err) {
      console.error('Error deleting job:', err)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
        <p className="text-muted-foreground">
          Create, modify, and monitor your cron jobs
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading jobs</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchJobs}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CreateJobForm onJobCreated={fetchJobs} />
        <JobList
          jobs={jobs}
          onPauseJob={handlePauseJob}
          onResumeJob={handleResumeJob}
          onRunJob={handleRunJob}
          onDeleteJob={handleDeleteJob}
          loading={loading}
        />
      </div>
    </div>
  )
}