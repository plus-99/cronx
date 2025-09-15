import { Cronx } from '@plus99/cronx'

// Singleton instance for the UI - using globalThis to survive HMR in development
declare global {
  var __cronxInstance: Cronx | undefined
}

export function getCronxInstance(): Cronx {
  if (!global.__cronxInstance) {
    // Initialize with memory storage for development, can be configured via env
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
    await cronx.start()
  }
  
  return cronx
}