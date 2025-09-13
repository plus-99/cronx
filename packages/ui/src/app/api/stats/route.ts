import { NextRequest, NextResponse } from 'next/server'
import { getCronxInstance } from '@/lib/cronx'

export async function GET() {
  try {
    const cronx = getCronxInstance()
    
    if (!cronx.isRunning) {
      await cronx.start()
    }
    
    const stats = await cronx.getStats()
    const jobStats = await cronx.getJobStats()
    
    return NextResponse.json({
      ...stats,
      totalRuns: jobStats.totalRuns,
      successfulRuns: jobStats.successfulRuns,
      failedRuns: jobStats.failedRuns,
      averageDuration: jobStats.averageDuration
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}