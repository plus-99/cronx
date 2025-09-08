import { StorageAdapter, StorageError } from '../types.js';
import { MemoryStorageAdapter } from './memory.js';
import { SQLiteStorageAdapter } from './sqlite.js';
import { PostgresStorageAdapter } from './postgres.js';
import { RedisStorageAdapter } from './redis.js';

export { MemoryStorageAdapter, SQLiteStorageAdapter, PostgresStorageAdapter, RedisStorageAdapter };

export function createStorageAdapter(config: string | StorageAdapter): StorageAdapter {
  if (typeof config === 'object') {
    return config;
  }

  const url = new URL(config);
  
  switch (url.protocol) {
    case 'memory:':
      return new MemoryStorageAdapter();
      
    case 'sqlite:':
      return new SQLiteStorageAdapter(url.pathname);
      
    case 'postgres:':
    case 'postgresql:':
      return new PostgresStorageAdapter(config);
      
    case 'redis:':
    case 'rediss:':
      return new RedisStorageAdapter(config);
      
    default:
      throw new StorageError(`Unsupported storage protocol: ${url.protocol}`);
  }
}