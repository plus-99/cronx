import { NextRequest, NextResponse } from 'next/server'
import { ensureCronxStarted } from '@/lib/cronx'

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const cronx = await ensureCronxStarted()
    const { name } = params
    
    await cronx.pauseJob(name)
    
    return NextResponse.json({ success: true, message: 'Job paused successfully' })
  } catch (error) {
    console.error(`Error pausing job ${params.name}:`, error)
    return NextResponse.json(
      { error: 'Failed to pause job' },
      { status: 500 }
    )
  }
}