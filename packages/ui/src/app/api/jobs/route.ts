import { NextRequest, NextResponse } from 'next/server'
import { getCronxInstance } from '@/lib/cronx'

export async function GET() {
  try {
    const cronx = getCronxInstance()
    
    if (!cronx.isRunning) {
      await cronx.start()
    }
    
    const jobs = await cronx.listJobs()
    
    // Convert jobs to serializable DTOs, removing non-serializable fields like functions
    const serializableJobs = jobs.map(job => ({
      name: job.name,
      schedule: job.schedule,
      paused: job.isPaused || false,
      nextRun: job.nextRun ? job.nextRun.toISOString() : null,
      lastRun: job.lastRun ? job.lastRun.toISOString() : null,
      retries: job.options?.retries || 0,
      timeout: job.options?.timeout || 5000,
      backoff: job.options?.backoff || 'fixed'
    }))
    
    return NextResponse.json(serializableJobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, schedule, code, options = {} } = body
    
    if (!name || !schedule || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: name, schedule, code' },
        { status: 400 }
      )
    }
    
    const cronx = getCronxInstance()
    
    if (!cronx.isRunning) {
      await cronx.start()
    }
    
    // Security: Only allow dynamic code execution in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Dynamic job creation is disabled in production for security' },
        { status: 403 }
      )
    }
    
    // Create function from code string (DEVELOPMENT ONLY - not safe for production)
    let jobFunction
    try {
      jobFunction = new Function('return ' + code)()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid job function code' },
        { status: 400 }
      )
    }
    
    await cronx.schedule(schedule, jobFunction, {
      name,
      ...options
    })
    
    return NextResponse.json({ success: true, message: 'Job scheduled successfully' })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}