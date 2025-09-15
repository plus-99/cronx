import { NextRequest, NextResponse } from 'next/server'
import { ensureCronxStarted } from '@/lib/cronx'

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const cronx = await ensureCronxStarted()
    const { name } = params
    
    await cronx.resumeJob(name)
    
    return NextResponse.json({ success: true, message: 'Job resumed successfully' })
  } catch (error) {
    console.error(`Error resuming job ${params.name}:`, error)
    return NextResponse.json(
      { error: 'Failed to resume job' },
      { status: 500 }
    )
  }
}