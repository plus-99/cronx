# Cronx Docker Examples

This directory contains Docker configurations for running Cronx with different storage backends and clustering scenarios.

## 🐳 Available Configurations

### Single Backend Examples

- **`docker-compose.redis.yml`** - Redis-based Cronx deployment with clustering
- **`docker-compose.postgres.yml`** - PostgreSQL-based Cronx deployment with clustering  
- **`docker-compose.sqlite.yml`** - SQLite-based Cronx deployment with clustering
- **`docker-compose.all.yml`** - Multi-backend demonstration with all storage types

### 🚀 Quick Start

```bash
# Build the Cronx Docker image
docker build -f examples/Dockerfile -t cronx:latest .

# Run Redis example with clustering
docker-compose -f examples/docker-compose.redis.yml up

# Run PostgreSQL example with clustering
docker-compose -f examples/docker-compose.postgres.yml up

# Run SQLite example with clustering
docker-compose -f examples/docker-compose.sqlite.yml up

# Run all backends together
docker-compose -f examples/docker-compose.all.yml up
```

## 📋 Example Scenarios

### Redis Clustering Demo
```bash
docker-compose -f examples/docker-compose.redis.yml up
```

**What it demonstrates:**
- High-performance Redis storage
- Multiple Cronx workers sharing Redis backend
- Distributed locking preventing job conflicts
- Performance monitoring and metrics collection

**Services:**
- `redis` - Redis server with persistence
- `cronx-worker` - Single worker example
- `cronx-cluster-1/2/3` - Clustering workers
- `cronx-performance` - Performance testing

### PostgreSQL Production Setup
```bash
docker-compose -f examples/docker-compose.postgres.yml up
```

**What it demonstrates:**
- Production-ready PostgreSQL storage
- Database initialization with proper schemas
- Multiple workers with distributed job execution
- Admin/monitoring tasks

**Services:**
- `postgres` - PostgreSQL database with health checks
- `cronx-worker` - Basic PostgreSQL worker
- `cronx-cluster-1/2/3` - Clustering demonstration
- `cronx-admin` - Administrative task worker

### SQLite File-Based Clustering
```bash
docker-compose -f examples/docker-compose.sqlite.yml up
```

**What it demonstrates:**
- File-based persistence with SQLite
- Shared volume for multi-container access
- Development-friendly setup
- Container clustering with shared database file

### Multi-Backend Comparison
```bash
docker-compose -f examples/docker-compose.all.yml up
```

**What it demonstrates:**
- Redis, PostgreSQL, and SQLite running simultaneously
- Performance comparison between storage backends
- Different job types optimized for each backend
- Cross-backend monitoring and metrics

## 🔧 Configuration

### Environment Variables

All examples support these environment variables:

```bash
# Storage backend
STORAGE_URL=redis://redis:6379
# or
STORAGE_URL=postgresql://cronx:cronx_password@postgres:5432/cronx
# or 
STORAGE_URL=sqlite:///app/data/cronx.db

# Worker identification
WORKER_ID=my-worker-name

# Environment
NODE_ENV=production
```

### Custom Job Examples

Each Docker setup runs different job examples:

- **`redis-basic.ts`** - High-frequency Redis jobs
- **`redis-clustering.ts`** - Redis clustering demo
- **`postgres-basic.ts`** - PostgreSQL data processing
- **`postgres-clustering.ts`** - PostgreSQL clustering
- **`admin-tasks.ts`** - Administrative and maintenance jobs
- **`performance-monitor.ts`** - Cross-backend performance monitoring

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose -f examples/docker-compose.redis.yml logs -f

# Specific service
docker-compose -f examples/docker-compose.redis.yml logs -f cronx-cluster-1

# Follow logs from multiple workers
docker-compose -f examples/docker-compose.redis.yml logs -f cronx-cluster-1 cronx-cluster-2
```

### Access Containers
```bash
# Connect to a worker container
docker exec -it cronx-cluster-1 sh

# Check Redis
docker exec -it cronx-redis redis-cli info

# Check PostgreSQL
docker exec -it cronx-postgres psql -U cronx -d cronx -c "SELECT * FROM jobs;"
```

## 🔄 Scaling

### Scale Workers Dynamically
```bash
# Scale Redis workers to 5 instances
docker-compose -f examples/docker-compose.redis.yml up --scale cronx-cluster-1=5

# Scale all cluster workers
docker-compose -f examples/docker-compose.redis.yml up \
  --scale cronx-cluster-1=3 \
  --scale cronx-cluster-2=3 \
  --scale cronx-cluster-3=2
```

### Production Scaling
```bash
# Production PostgreSQL setup
docker-compose -f examples/docker-compose.postgres.yml up \
  --scale cronx-cluster-1=4 \
  --scale cronx-cluster-2=4 \
  --scale cronx-admin=2
```

## 🛠️ Development

### Hot Reloading
For development, mount your source code:

```yaml
services:
  cronx-dev:
    build:
      context: ..
      dockerfile: examples/Dockerfile
    volumes:
      - ../packages/core/dist:/app/packages/core/dist
      - ../examples:/app/examples
    environment:
      - NODE_ENV=development
```

### Custom Jobs
Create your own job examples by adding them to the examples directory and updating the Docker Compose command:

```yaml
command: ["node", "examples/my-custom-job.ts"]
```

## 🚨 Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
# Check Redis health
docker-compose -f examples/docker-compose.redis.yml exec redis redis-cli ping

# View Redis logs
docker-compose -f examples/docker-compose.redis.yml logs redis
```

**PostgreSQL Connection Issues**
```bash
# Check PostgreSQL health
docker-compose -f examples/docker-compose.postgres.yml exec postgres pg_isready -U cronx

# Check database
docker-compose -f examples/docker-compose.postgres.yml exec postgres psql -U cronx -d cronx -c "\dt"
```

**SQLite Permission Issues**
```bash
# Check volume permissions
docker-compose -f examples/docker-compose.sqlite.yml exec cronx-worker ls -la /app/data/

# Fix permissions
docker-compose -f examples/docker-compose.sqlite.yml exec cronx-worker chown cronx:cronx /app/data/
```

### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check worker logs for performance metrics
docker-compose -f examples/docker-compose.all.yml logs -f performance-monitor
```

## 📈 Production Deployment

For production deployment:

1. **Use external databases** - Don't rely on container databases
2. **Configure proper volumes** - Ensure data persistence  
3. **Set resource limits** - Configure memory and CPU limits
4. **Enable health checks** - Monitor service health
5. **Use secrets** - Don't hardcode passwords in compose files
6. **Configure logging** - Set up log aggregation
7. **Monitor metrics** - Enable Prometheus metrics collection

### Production Example
```yaml
services:
  cronx-worker:
    image: cronx:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: 0.5
        reservations:
          memory: 256M
          cpus: 0.25
    environment:
      - STORAGE_URL=${DATABASE_URL}
      - WORKER_ID=${HOSTNAME}
      - NODE_ENV=production
    secrets:
      - db_password
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```