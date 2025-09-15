import { NextRequest, NextResponse } from 'next/server'
import { ensureCronxStarted } from '@/lib/cronx'

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const cronx = await ensureCronxStarted()
    const { name } = params
    
    const [job, stats, runs] = await Promise.all([
      cronx.getJob(name),
      cronx.getJobStats(name),
      cronx.getJobRuns(name, 20)
    ])
    
    return NextResponse.json({
      job,
      stats,
      runs
    })
  } catch (error) {
    console.error(`Error fetching job ${params.name}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const cronx = await ensureCronxStarted()
    const { name } = params
    
    await cronx.unschedule(name)
    
    return NextResponse.json({ success: true, message: 'Job deleted successfully' })
  } catch (error) {
    console.error(`Error deleting job ${params.name}:`, error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}