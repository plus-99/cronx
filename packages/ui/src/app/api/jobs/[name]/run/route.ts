import { NextRequest, NextResponse } from 'next/server'
import { ensureCronxStarted } from '@/lib/cronx'

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const cronx = await ensureCronxStarted()
    const { name } = params
    
    await cronx.runJob(name)
    
    return NextResponse.json({ success: true, message: 'Job executed successfully' })
  } catch (error) {
    console.error(`Error running job ${params.name}:`, error)
    return NextResponse.json(
      { error: 'Failed to run job' },
      { status: 500 }
    )
  }
}