import { NextRequest, NextResponse } from 'next/server'
import { getCronxInstance } from '@/lib/cronx'

export async function GET() {
  try {
    const cronx = getCronxInstance()
    
    if (!cronx.isRunning) {
      await cronx.start()
    }
    
    const metrics = await cronx.getMetrics()
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}