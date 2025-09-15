import { Cronx } from '@plus99/cronx'

// Singleton instance for the UI - using globalThis to survive HMR in development
declare global {
  var __cronxInstance: Cronx | undefined
}

export function getCronxInstance(): Cronx {
  if (!global.__cronxInstance) {
    const storageUrl = process.env.CRONX_STORAGE_URL || 'memory://'
    
    console.log('Creating Cronx instance with storage:', storageUrl)
    
    global.__cronxInstance = new Cronx({
      storage: storageUrl,
      workerId: 'cronx-ui',
      metrics: true
    })
  }
  
  return global.__cronxInstance
}

export async function ensureCronxStarted(): Promise<Cronx> {
  const cronx = getCronxInstance()
  
  if (!cronx.isRunning) {
    try {
      await cronx.start()
      console.log('Cronx instance started successfully with storage connection')
    } catch (error) {
      console.error('Failed to start Cronx instance:', error)
      throw error
    }
  }
  
  return cronx
}