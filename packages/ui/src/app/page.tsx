'use client'

import { useState, useEffect } from 'react'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { JobList } from '@/components/dashboard/job-list'
import { JobStats, Job } from '@/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<JobStats | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [statsRes, jobsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/jobs')
      ])

      if (!statsRes.ok || !jobsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [statsData, jobsData] = await Promise.all([
        statsRes.json(),
        jobsRes.json()
      ])

      setStats(statsData)
      setJobs(jobsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePauseJob = async (name: string) => {
    try {
      const res = await fetch(`/api/jobs/${name}/pause`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to pause job')
      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error pausing job:', err)
    }
  }

  const handleResumeJob = async (name: string) => {
    try {
      const res = await fetch(`/api/jobs/${name}/resume`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to resume job')
      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error resuming job:', err)
    }
  }

  const handleRunJob = async (name: string) => {
    try {
      const res = await fetch(`/api/jobs/${name}/run`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to run job')
      // Don't refresh immediately, let user see the action completed
      setTimeout(fetchData, 1000)
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
      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error deleting job:', err)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cronx Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your scheduled cron jobs
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      <StatsCards stats={stats} loading={loading} />

      <JobList
        jobs={jobs}
        onPauseJob={handlePauseJob}
        onResumeJob={handleResumeJob}
        onRunJob={handleRunJob}
        onDeleteJob={handleDeleteJob}
        loading={loading}
      />
    </div>
  )
}