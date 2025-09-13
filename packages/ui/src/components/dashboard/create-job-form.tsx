'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface CreateJobFormProps {
  onJobCreated: () => void
}

export function CreateJobForm({ onJobCreated }: CreateJobFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    schedule: '*/5 * * * *', // Every 5 minutes default
    code: 'async () => {\n  console.log("Hello from Cronx!");\n  return { status: "success", timestamp: new Date() };\n}',
    retries: 3,
    timeout: 5000,
    backoff: 'exponential' as 'fixed' | 'exponential'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          options: {
            retries: formData.retries,
            timeout: formData.timeout,
            backoff: formData.backoff
          }
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create job')
      }

      // Reset form
      setFormData({
        name: '',
        schedule: '*/5 * * * *',
        code: 'async () => {\n  console.log("Hello from Cronx!");\n  return { status: "success", timestamp: new Date() };\n}',
        retries: 3,
        timeout: 5000,
        backoff: 'exponential'
      })

      onJobCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Job</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Job Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
              placeholder="my-job"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Cron Schedule</label>
            <input
              type="text"
              value={formData.schedule}
              onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
              placeholder="*/5 * * * *"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Examples: "*/5 * * * *" (every 5 min), "0 9 * * 1" (Mondays 9 AM)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Job Function</label>
            <textarea
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md font-mono text-sm"
              rows={6}
              placeholder="async () => { ... }"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Write an async function that returns a result or throws an error
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Retries</label>
              <input
                type="number"
                value={formData.retries}
                onChange={(e) => setFormData(prev => ({ ...prev, retries: parseInt(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                min="0"
                max="10"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Timeout (ms)</label>
              <input
                type="number"
                value={formData.timeout}
                onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                min="1000"
                step="1000"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Backoff Strategy</label>
            <select
              value={formData.backoff}
              onChange={(e) => setFormData(prev => ({ ...prev, backoff: e.target.value as 'fixed' | 'exponential' }))}
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="fixed">Fixed Delay</option>
              <option value="exponential">Exponential Backoff</option>
            </select>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Job'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}