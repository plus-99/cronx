import { NextRequest, NextResponse } from 'next/server'
import { getCronxInstance } from '@/lib/cronx'

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const cronx = getCronxInstance()
    const { name } = params
    
    await cronx.runJobNow(name)
    
    return NextResponse.json({ success: true, message: 'Job executed successfully' })
  } catch (error) {
    console.error(`Error running job ${params.name}:`, error)
    return NextResponse.json(
      { error: 'Failed to run job' },
      { status: 500 }
    )
  }
}