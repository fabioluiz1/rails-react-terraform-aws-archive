# Design Instagram: System Design Interview Study Guide

A comprehensive guide for CTO-level interviews focusing on cost implications,
business trade-offs, and pragmatic engineering decisions.

---

## Step 1: Requirements & Clarifications (3-10 minutes)

### Questions to Ask Upfront

**Scale & Traffic:**

- What's the expected DAU (Daily Active Users)?
- Read-heavy or write-heavy workload?
- Geographic distribution of users?
- Peak traffic patterns (events, time zones)?

**Feature Scope:**

- Core features only or full platform?
- Real-time requirements (notifications, DMs)?
- Content moderation requirements?
- Analytics and recommendation systems?

**Constraints:**

- Budget constraints or cost targets?
- Team size and operational capacity?
- Compliance requirements (GDPR, data residency)?
- Existing infrastructure to integrate with?

### Sample Numbers (Confirm These)

| Metric | Value |
|--------|-------|
| Daily Active Users (DAU) | 500M |
| Posts per day | 100M |
| Average image size | 1MB (original) |
| Average compressed/optimized | 200KB |
| Images viewed per user/day | 50 |
| Feed refresh rate | 10x/day |
| Story views per user/day | 20 |
| DMs per user/day | 5 |

### Feature Scope (Prioritized)

**P0 - MVP:**

- User registration/authentication
- Post images with captions
- Follow/unfollow users
- Home feed (chronological or ranked)
- Like and comment

**P1 - Core Experience:**

- Stories (24-hour ephemeral content)
- Direct messages
- Search (users, hashtags)
- Notifications
- Image filters/editing

**P2 - Growth & Engagement:**

- Explore/discovery feed
- Reels (short video)
- Live streaming
- Shopping/commerce
- Ads platform

---

## Step 2: High-Level Architecture (10-15 minutes)

### System Components

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENTS                                      │
│                    (iOS, Android, Web, API Partners)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CDN (CloudFront)                                │
│                     - Static assets, images, videos                         │
│                     - Edge caching, SSL termination                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOAD BALANCER (ALB)                                │
│                    - SSL termination, health checks                         │
│                    - Rate limiting, DDoS protection                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / ROUTING                              │
│                    - Authentication, authorization                          │
│                    - Request validation, rate limiting                      │
│                    - API versioning, request routing                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    USER SERVICE     │ │    POST SERVICE     │ │    FEED SERVICE     │
│  - Auth/profiles    │ │  - CRUD posts       │ │  - Feed generation  │
│  - Follow graph     │ │  - Media upload     │ │  - Feed ranking     │
│  - User search      │ │  - Comments/likes   │ │  - Timeline cache   │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
              │                       │                       │
              ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CACHE LAYER                                     │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ User Cache  │  │ Post Cache  │  │ Feed Cache  │  │Session Cache│        │
│  │  (Redis)    │  │  (Redis)    │  │  (Redis)    │  │  (Redis)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
              │                       │                       │
              ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATABASE LAYER                                   │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Users (Postgres)│  │  Posts (Postgres)│  │ Feed (Cassandra) │          │
│  │  - User data     │  │  - Post metadata │  │  - Pre-computed  │          │
│  │  - Follow graph  │  │  - Comments      │  │    timelines     │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                                 │
│  │ Search (Elastic) │  │  Analytics (BQ)  │                                 │
│  │  - Full-text     │  │  - Events, logs  │                                 │
│  │  - Hashtags      │  │  - Metrics       │                                 │
│  └──────────────────┘  └──────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ASYNC PROCESSING                                   │
│                                                                              │
│  ┌──────────────────┐        ┌──────────────────────────────────┐          │
│  │  Message Queue   │───────▶│          WORKERS                 │          │
│  │  (SQS / Kafka)   │        │  - Image processing              │          │
│  │                  │        │  - Feed fanout                   │          │
│  │  - Post events   │        │  - Notifications                 │          │
│  │  - Notifications │        │  - Search indexing               │          │
│  │  - Analytics     │        │  - Analytics aggregation         │          │
│  └──────────────────┘        └──────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OBJECT STORAGE (S3)                                │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Originals  │  │ Thumbnails  │  │   Videos    │  │   Stories   │        │
│  │  (Standard) │  │ (Standard)  │  │ (Standard)  │  │    (IA)     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Two Main Flows

#### Flow 1: Post Publishing

```text
1. Client uploads image to pre-signed S3 URL (direct upload)
2. Client sends POST /posts with S3 key, caption, tags
3. API Gateway authenticates, routes to Post Service
4. Post Service:
   a. Validates request
   b. Creates post record in Postgres
   c. Publishes event to message queue
5. Async Workers:
   a. Image Worker: generates thumbnails (150px, 480px, 1080px)
   b. Feed Worker: fans out post to followers' feeds
   c. Search Worker: indexes hashtags and content
   d. Notification Worker: sends push to mentioned users
6. CDN caches images on first request
```

#### Flow 2: Feed Retrieval

```text
1. Client requests GET /feed?cursor=xyz
2. CDN: cache miss (personalized content)
3. Load Balancer routes to API Gateway
4. Feed Service:
   a. Check Redis for pre-computed feed
   b. Cache HIT: return cached feed IDs
   c. Cache MISS: query Cassandra for timeline
5. Post Service: batch fetch post details for IDs
6. User Service: batch fetch author details
7. Assemble response, return to client
8. Client caches locally for offline access
```

---

## Step 3: Deep Dive with COST FOCUS (10-25 minutes)

### CDN & Bandwidth

**Technical Purpose:**

- Cache static content at edge locations (images, videos, JS/CSS)
- Reduce latency (serve from nearest POP)
- Offload origin servers
- SSL termination at edge

**Cost Implications (THE BIG ONE):**

Bandwidth is typically the #1 cost for image-heavy platforms.

| Cost Component | AWS Pricing | Monthly at Scale |
|----------------|-------------|------------------|
| S3 egress to internet | $0.09/GB | Massive |
| S3 egress to CloudFront | $0.00/GB | Free (same region) |
| CloudFront egress | $0.085/GB (first 10TB) | Still massive |
| CloudFront egress | $0.020/GB (>5PB) | Volume discounts |

**The Double-Hit Problem:**

```text
Without CDN:    User → S3 → User (pay S3 egress: $0.09/GB)
With CDN miss:  User → CloudFront → S3 → CloudFront → User
                (pay CloudFront egress, S3→CF is free)
With CDN hit:   User → CloudFront → User
                (pay CloudFront egress only, much cheaper at volume)
```

**Optimization Strategies:**

1. **Maximize cache-hit ratio (target: 95%+)**
   - Set long TTLs for immutable content (images never change)
   - Use content-based URLs: `/images/{hash}.jpg` not `/images/post123.jpg`
   - Normalize query strings (or ignore them)

2. **Use appropriate edge locations**
   - Disable expensive edge locations you don't need
   - Price Class 100 (US/EU only) vs All Edge Locations

3. **Compress everything**
   - Enable gzip/brotli for text content
   - Use modern image formats (WebP, AVIF) - 30% smaller than JPEG

4. **Consider Cloudflare**
   - Flat-rate bandwidth (included in plan)
   - $200/mo Pro plan = unlimited bandwidth
   - Trade-off: less AWS integration, different feature set

**CloudFront vs Cloudflare Cost Comparison:**

| Scenario | CloudFront | Cloudflare Pro |
|----------|------------|----------------|
| 100TB/month | ~$5,000 | $200 |
| 1PB/month | ~$30,000 | $200 |
| 5PB/month | ~$100,000 | $200 (or Enterprise) |

**Trade-offs:**

- CloudFront: Better AWS integration, Lambda@Edge, more control
- Cloudflare: Dramatically cheaper bandwidth, simpler, less AWS-native

### Object Storage (S3)

**Technical Purpose:**

- Durable, scalable storage for user-generated content
- 99.999999999% (11 9s) durability
- Lifecycle management for cost optimization

**Storage Tier Pricing:**

| Tier | Price/GB/month | Use Case |
|------|----------------|----------|
| S3 Standard | $0.023 | Frequently accessed (recent posts) |
| S3 Intelligent-Tiering | $0.023 + monitoring | Unknown access patterns |
| S3 Standard-IA | $0.0125 | Older posts (30+ days) |
| S3 One Zone-IA | $0.01 | Non-critical, reproducible |
| S3 Glacier Instant | $0.004 | Archive, rare access |
| S3 Glacier Deep Archive | $0.00099 | Compliance, never accessed |

**Request Pricing:**

| Operation | Price per 1,000 requests |
|-----------|--------------------------|
| PUT, COPY, POST | $0.005 |
| GET, SELECT | $0.0004 |
| Lifecycle transition | $0.01 |

**Cost Implications:**

For 100M posts/day:

```text
Original upload:   100M × $0.005/1000 = $500/day
Thumbnail GETs:    500M users × 50 images × $0.0004/1000 = $10,000/day
                   (if not cached - with 95% cache hit = $500/day)
Storage growth:    100M × 1MB × $0.023/GB = $2.3M/month (originals only)
```

**Optimization Strategies:**

1. **Lifecycle Policies (HUGE savings)**

   ```text
   Day 0-30:    S3 Standard ($0.023/GB)
   Day 30-90:   S3 Standard-IA ($0.0125/GB) - 46% savings
   Day 90-365:  S3 Glacier Instant ($0.004/GB) - 83% savings
   Day 365+:    S3 Glacier Deep Archive ($0.001/GB) - 96% savings
   ```

2. **Don't store what you don't need**
   - Delete failed uploads automatically
   - Consider not keeping originals after processing
   - Let users delete their content (GDPR anyway)

3. **Compress and optimize images**
   - JPEG quality 80 vs 100 = 50% size reduction, minimal quality loss
   - WebP = 30% smaller than JPEG
   - Strip EXIF metadata (also privacy benefit)

4. **Multi-region strategy**
   - Store in cheapest region, replicate to edge via CDN
   - Cross-region replication only for compliance/DR

**Trade-offs:**

- Standard vs IA: IA has minimum 30-day charge, retrieval fees
- Single region vs multi-region: cost vs latency vs compliance
- Keep originals vs discard: storage cost vs user expectations

### Database Architecture

**Options Comparison:**

| Database | Best For | Cost Model | Instagram Use |
|----------|----------|------------|---------------|
| PostgreSQL (RDS) | Users, posts, relations | Instance + storage | Core metadata |
| Aurora | Same, auto-scaling | Instance + I/O | High-traffic metadata |
| DynamoDB | Key-value, high scale | Read/write capacity | Sessions, counters |
| Cassandra | Time-series, feeds | Self-managed or Keyspaces | Pre-computed feeds |
| Redis | Caching, sessions | Memory (expensive) | Feed cache, sessions |
| Elasticsearch | Search, full-text | Instance + storage | User/hashtag search |

**Schema Design:**

```sql
-- Users (PostgreSQL - strong consistency for auth)
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Follow Graph (PostgreSQL or dedicated graph DB at scale)
CREATE TABLE follows (
  follower_id BIGINT REFERENCES users(id),
  following_id BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Posts (PostgreSQL, sharded by user_id at scale)
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  image_url VARCHAR(500) NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
```

**Cost Implications:**

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| RDS PostgreSQL db.r6g.xlarge | 4 vCPU, 32GB RAM | ~$550 |
| + Read Replica | Same | +$550 |
| + Multi-AZ | Standby | +$550 |
| + Storage (1TB GP3) | | +$115 |
| Aurora Serverless v2 | 0.5-128 ACU | $0.12/ACU-hour |
| DynamoDB On-Demand | Per request | $1.25/M writes, $0.25/M reads |
| ElastiCache Redis r6g.xlarge | 26GB | ~$450 |

**Optimization Strategies:**

1. **Read replicas strategically**
   - Use for read-heavy workloads (feeds, profiles)
   - Don't over-provision; scale based on actual CPU

2. **Connection pooling**
   - Use PgBouncer or RDS Proxy
   - Reduce connection overhead, enable serverless patterns

3. **Sharding strategy**
   - Shard by user_id (posts, follows)
   - Keeps related data together
   - Use consistent hashing for distribution

4. **Reserved instances**
   - 1-year reserved: 30-40% savings
   - 3-year reserved: 60% savings
   - Only for stable, predictable workloads

**Trade-offs:**

| Decision | Option A | Option B |
|----------|----------|----------|
| RDS vs Aurora | Predictable cost | Auto-scaling, higher ceiling |
| Single-AZ vs Multi-AZ | 50% cheaper | High availability |
| Provisioned vs On-Demand | Predictable | Spiky workloads |

### Caching Strategy

**Cache Layers:**

```text
L1: Client cache (app memory)     - Free, fastest
L2: CDN cache (CloudFront)        - Per-request cost
L3: Application cache (Redis)     - Memory cost
L4: Database query cache          - Usually disable (stale data issues)
```

**What to Cache:**

| Data Type | TTL | Cache | Invalidation |
|-----------|-----|-------|--------------|
| User profiles | 5 min | Redis | On update |
| Post metadata | 1 hour | Redis | On update |
| Feed (post IDs) | 5 min | Redis | On new post from followed |
| Follower counts | 1 min | Redis | Async update |
| Images | Forever | CDN | Never (immutable URLs) |
| Sessions | 24 hours | Redis | On logout |

**Cost of Cache Miss:**

```text
Cache HIT:  Redis lookup = 0.5ms, ~$0.000001
Cache MISS: Redis lookup + DB query + cache write
            = 0.5ms + 50ms + 1ms = 51.5ms
            = ~$0.00001 (DB I/O) + latency cost
```

At 1M requests/second, 1% cache miss improvement = 10,000 fewer DB queries/second.

**Redis Sizing:**

```text
Feed cache: 500M users × 100 post IDs × 8 bytes = 400GB
User cache: 500M users × 1KB = 500GB
Post cache: Hot posts (10M) × 2KB = 20GB
Sessions:   100M sessions × 500 bytes = 50GB
─────────────────────────────────────────────────
Total:      ~1TB Redis cluster needed
```

At $0.017/GB/hour (ElastiCache), 1TB = ~$12,500/month.

**Optimization Strategies:**

1. **Right-size cache entries**
   - Don't cache entire objects; cache what you need
   - Use compression for large values

2. **Tiered caching**
   - Hot data in Redis (expensive)
   - Warm data in Memcached (cheaper)
   - Cold data direct to DB

3. **Cache-aside vs write-through**
   - Cache-aside: simpler, risk of stale data
   - Write-through: consistent, more complex

4. **TTL tuning**
   - Too short: cache misses, DB load
   - Too long: stale data, memory waste

### Feed Generation: The Core Trade-off

**Fan-out on Write (Push Model):**

```text
User posts → Write post to all followers' feeds immediately

Pros:
- Fast reads (feed is pre-computed)
- Simple read path
- Low read latency

Cons:
- High write amplification (celebrity with 100M followers = 100M writes)
- Wasted writes for inactive users
- High storage cost for feed cache
```

**Fan-out on Read (Pull Model):**

```text
User requests feed → Fetch posts from all followed users, merge, rank

Pros:
- No wasted writes
- Lower storage cost
- Fresh data

Cons:
- Slow reads (many DB queries)
- Complex read path
- High read latency
```

**Hybrid Approach (What Instagram Uses):**

```text
Regular users (< 10K followers): Fan-out on write
Celebrities (> 10K followers):   Fan-out on read

Feed request:
1. Get pre-computed feed from cache (regular users' posts)
2. Fetch recent posts from celebrities followed
3. Merge and rank
4. Return top N
```

**Cost Comparison:**

| Approach | Write Cost | Read Cost | Storage |
|----------|------------|-----------|---------|
| Push (all) | $$$$ (write amplification) | $ | $$$ |
| Pull (all) | $ | $$$$ (read amplification) | $ |
| Hybrid | $$ | $$ | $$ |

**Fan-out Cost Math:**

```text
100M posts/day, average 500 followers:
Push: 100M × 500 = 50B feed writes/day
      50B × $1.25/M (DynamoDB) = $62,500/day

Pull: 500M users × 10 feed loads × 200 following
      = 1T post fetches/day
      = way more expensive in DB load

Hybrid: 90% posts (regular users) × 500 followers = 45B writes
        + 10% celebrity posts fetched on read
        = ~$50,000/day + manageable read load
```

### Image Processing

**On-the-fly vs Pre-generated:**

| Approach | Pros | Cons |
|----------|------|------|
| Pre-generate all sizes | Fast delivery, simple CDN | Storage cost, processing delay |
| On-the-fly (Lambda@Edge) | Storage savings, flexible | Compute cost, latency |
| Hybrid | Balance | Complexity |

**Pre-generated Thumbnails (Recommended):**

```text
Original:    1MB
Large:       1080px, 200KB
Medium:      480px, 50KB
Thumbnail:   150px, 10KB
─────────────────────────────
Total:       ~1.3MB per post
```

Processing cost with Lambda:

```text
100M posts/day × 4 sizes × 500ms × $0.0000166/GB-sec
= 100M × 4 × 0.5 × 0.0000166 × 0.5GB
= ~$1,660/day
```

vs dedicated workers (c6i.xlarge):

```text
10 instances × $0.17/hour × 24 hours = $40.80/day
Can process: 10 × 1000 images/min × 60 × 24 = 14.4M/day
Need 7× more = $285/day for 100M images
```

**Recommendation:** Dedicated workers for predictable workloads, Lambda for spikes.

**Optimization Strategies:**

1. **Direct-to-S3 uploads**
   - Client uploads directly via pre-signed URL
   - Reduces API server load and bandwidth

2. **Progressive JPEG**
   - Loads blurry first, then sharpens
   - Better perceived performance

3. **Client-side resizing**
   - Resize before upload (e.g., max 4K)
   - Reduces upload bandwidth

4. **Lazy thumbnail generation**
   - Generate on first request, cache forever
   - Good for low-traffic content

---

## Step 4: Back-of-Envelope Calculations

### Storage Calculations

```text
Daily uploads:
  100M posts × 1MB original = 100TB/day originals
  100M posts × 0.3MB thumbs = 30TB/day thumbnails
  Total: 130TB/day new storage

Annual storage:
  130TB × 365 = 47.5PB/year (without lifecycle)

With lifecycle policies:
  First 30 days (Standard):     3.9PB × $0.023 = $89,700/mo
  Days 30-90 (Standard-IA):     7.8PB × $0.0125 = $97,500/mo
  Days 90-365 (Glacier Instant): 26.3PB × $0.004 = $105,200/mo
  Archive (Deep Archive):        Previous years × $0.001

Optimized annual storage cost: ~$3.5M/year vs ~$13M without lifecycle
```

### Bandwidth Calculations

```text
Daily egress:
  500M users × 50 images × 200KB average = 5PB/day

With 95% CDN cache hit:
  5PB × 5% = 250TB/day cache misses (S3 → CDN, free)
  5PB × 100% = 5PB/day CDN → users

CloudFront cost at volume ($0.02/GB after 5PB):
  5PB × $0.02 = $100,000/day = $3M/month

With Cloudflare:
  ~$5,000/month (Enterprise) = 99.8% savings
```

### Compute Calculations

```text
API servers (handle 100K RPS):
  100K RPS ÷ 1000 RPS/server = 100 servers
  100 × c6i.xlarge × $0.17/hr = $1,224/day = $37K/month

Feed workers (fan-out):
  50B writes/day ÷ 10K writes/sec/worker = 58 workers
  58 × c6i.large × $0.085/hr = $118/day = $3.5K/month

Image processors:
  100M images ÷ 1M/day/worker = 100 workers
  100 × c6i.xlarge × $0.17/hr = $408/day = $12K/month
```

### Total Monthly Cost Estimate

| Component | Monthly Cost |
|-----------|--------------|
| CDN (Cloudflare Enterprise) | $5,000 |
| S3 Storage (lifecycle optimized) | $300,000 |
| RDS PostgreSQL (primary + replicas) | $50,000 |
| ElastiCache Redis (1TB cluster) | $15,000 |
| DynamoDB (feed storage) | $100,000 |
| EC2 API servers | $40,000 |
| EC2 Workers | $20,000 |
| Load Balancers | $5,000 |
| Data transfer (misc) | $10,000 |
| Monitoring, logging | $5,000 |
| **Total** | **~$550,000/month** |

At 500M DAU: **$0.001/user/month** or **$1.10/user/year**

---

## Bottlenecks & Scaling

### Identify Bottlenecks

| Component | Bottleneck Sign | Scaling Solution |
|-----------|-----------------|------------------|
| API servers | High CPU, slow response | Horizontal scale, add instances |
| Database reads | Replica lag, slow queries | Add read replicas, query optimization |
| Database writes | Write latency, locks | Sharding, write-through cache |
| Redis | Memory full, evictions | Cluster mode, larger nodes |
| Feed fan-out | Queue depth growing | More workers, batch processing |
| Image processing | Queue backlog | Auto-scaling workers |

### Horizontal vs Vertical Scaling

| Situation | Vertical | Horizontal |
|-----------|----------|------------|
| Database (primary) | First choice (simpler) | When vertical limit reached |
| Cache (Redis) | Memory limit | Cluster for >100GB |
| API servers | Never | Always |
| Workers | Memory-bound tasks | CPU-bound tasks |

### Cost-Effective Scaling Strategies

1. **Auto-scaling with mixed instances**
   - On-demand for baseline
   - Spot instances for burst (70% savings)

2. **Right-sizing**
   - Review utilization monthly
   - Downsize over-provisioned resources

3. **Reserved capacity**
   - Commit to baseline (1-year: 30% off)
   - On-demand/spot for variable

4. **Caching before scaling**
   - Every cache-hit ratio improvement delays scaling
   - 5% better caching can delay 20% capacity add

---

## Sample CTO Follow-up Questions & Answers

### "What's the most expensive part of this system?"

**Answer:** Bandwidth egress, then storage.

At scale, bandwidth dominates:

- 5PB/day egress × $0.02/GB = $100K/day with CloudFront
- Storage is ~$300K/month, grows linearly
- Compute is relatively cheap at ~$60K/month

The key insight is that **every image is uploaded once but viewed thousands of
times**. The read amplification on bandwidth is massive. This is why CDN
cache-hit ratio is the single most important metric for cost.

### "How would you cut costs by 30%?"

**Answer:** Three main levers:

1. **Switch to Cloudflare for CDN (saves $3M/month → 85% of CDN cost)**
   - Flat-rate bandwidth pricing
   - Trade-off: less AWS integration

2. **Aggressive lifecycle policies (saves $500K/month → 60% of storage)**
   - Move 30-day content to IA
   - Move 90-day content to Glacier Instant
   - Archive stories after 30 days

3. **Improve cache-hit ratio from 95% to 98% (saves $150K/month)**
   - Immutable URLs for all content
   - Longer TTLs
   - Normalize request patterns

4. **Reserved instances for stable workloads (saves $50K/month)**
   - Database: 1-year reserved
   - Baseline API servers: 1-year reserved

Combined: ~$3.7M/month savings = 67% reduction.

### "What would you build with a 3-person team for MVP?"

**Answer:** Maximize managed services, minimize operational burden.

**Architecture:**

```text
- Monolith Rails/Django API on Heroku or Railway
- PostgreSQL (managed)
- Redis (managed, small)
- S3 for images
- Cloudflare for CDN (free tier to start)
- Vercel/Netlify for web frontend
```

**What to skip for MVP:**

- Microservices (use monolith)
- Feed pre-computation (simple reverse-chronological query)
- Multiple thumbnail sizes (one size fits most)
- Real-time features (polling is fine)
- Search (basic SQL LIKE is fine for MVP)

**Cost:** ~$500-1000/month for first 10K users.

**Key principle:** Optimize for iteration speed, not scale. You can refactor
when you have the problem (and the revenue).

### "Microservices vs monolith for Instagram?"

**Answer:** Start monolith, extract when pain points emerge.

**Start with monolith because:**

- Faster development (no network boundaries)
- Simpler deployment (one artifact)
- Easier debugging (one log stream)
- Lower operational cost (fewer things to monitor)

**Extract services when you see:**

- Different scaling needs (feed service needs 10x compute vs user service)
- Different team ownership (team A owns posts, team B owns feed)
- Different deployment cadence (feed algorithm changes daily, user auth yearly)
- Different reliability requirements (feed can degrade, auth cannot)

**Extraction order for Instagram:**

1. Image processing → Lambda or separate worker (async, bursty)
2. Feed service → Separate service (high scale, different DB)
3. Notifications → Separate service (async, external dependencies)
4. Search → Separate service (Elasticsearch, specialized)
5. Messaging → Separate service (real-time, different protocol)

### "How would you handle a celebrity posting to 100M followers?"

**Answer:** Hybrid fan-out with special handling for high-follower accounts.

**Strategy:**

1. **Detect celebrity posts** (follower count > threshold, e.g., 100K)
2. **Skip fan-out on write** for these posts
3. **Mark post as "celebrity post"** in metadata
4. **On feed read:**
   - Fetch pre-computed feed (regular users' posts)
   - Query recent posts from followed celebrities (small list)
   - Merge and rank

**Why this works:**

- Celebrity posts are small % of total posts
- Users follow few celebrities (< 100 typically)
- Querying 100 celebrities' recent posts is fast

**Additional optimizations:**

- Cache celebrity feeds separately (high hit ratio)
- Pre-compute "trending celebrity posts" for Explore
- Rate-limit celebrity posting (no one posts 100x/minute)

### "What metrics would you monitor?"

**Answer:** Business metrics, performance metrics, cost metrics.

**Business:**

- DAU/MAU, posts/day, engagement rate
- User retention cohorts
- Feed scroll depth

**Performance:**

- P50/P95/P99 latency by endpoint
- Error rates by service
- Cache hit ratios
- Queue depths and processing times

**Cost:**

- Daily spend by service
- Cost per user
- Bandwidth utilization
- Storage growth rate

**Alert thresholds:**

- Error rate > 1%
- P99 latency > 500ms
- Cache hit ratio < 90%
- Queue depth > 10K
- Daily cost > 110% of baseline

### "What would break first at 10x scale?"

**Answer:** Database writes and feed fan-out.

**At 10x (5B DAU, 1B posts/day):**

1. **Database writes saturate**
   - Solution: Sharding by user_id
   - Complexity: Cross-shard queries for follower graphs

2. **Feed fan-out overwhelms workers**
   - Solution: More aggressive hybrid approach
   - Raise celebrity threshold, batch fan-out

3. **Redis cluster size becomes unwieldy**
   - Solution: Tiered caching, cold feed eviction
   - Store only active users' feeds

4. **Single region latency**
   - Solution: Multi-region deployment
   - Complexity: Data replication, consistency

**What scales well:**

- CDN (designed for this)
- S3 (infinite scale)
- Stateless API servers (horizontal)

---

## Interview Tips for CTO Conversation

### What CTOs Care About

1. **Cost consciousness** - Can you think about $/user, $/request?
2. **Trade-off thinking** - Can you articulate both sides?
3. **Pragmatism** - Will you over-engineer or ship?
4. **Operational awareness** - Can you run this at 3 AM?
5. **Business alignment** - Does technical choice serve business goals?

### Things to Say

- "At our scale, this would cost approximately..."
- "The trade-off here is X vs Y, and I'd choose..."
- "For MVP, I'd skip this and revisit when..."
- "This is expensive but necessary because..."
- "We could save X by accepting Y trade-off"

### Things to Avoid

- Over-engineering for hypothetical scale
- Ignoring cost implications
- Presenting only one option
- Claiming something is "best" without context
- Forgetting operational complexity

### How to Handle "I Don't Know"

- "I'm not sure of the exact number, but I'd estimate..."
- "That's outside my direct experience, but my approach would be..."
- "I'd want to benchmark that before committing, but my hypothesis is..."

---

## Quick Reference Card

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| S3 Standard | $0.023/GB/month |
| S3 IA | $0.0125/GB/month |
| S3 egress | $0.09/GB (to internet) |
| CloudFront egress | $0.085-0.02/GB |
| Redis memory | ~$0.017/GB/hour |
| DynamoDB write | $1.25/million |
| DynamoDB read | $0.25/million |

### Key Ratios to Target

| Metric | Target |
|--------|--------|
| CDN cache hit ratio | > 95% |
| API cache hit ratio | > 90% |
| Database read replica lag | < 100ms |
| P99 API latency | < 500ms |
| Error rate | < 0.1% |

### Cost Optimization Checklist

- [ ] CDN cache-hit ratio maximized
- [ ] S3 lifecycle policies configured
- [ ] Reserved instances for stable workloads
- [ ] Spot instances for batch processing
- [ ] Right-sized database instances
- [ ] Compression enabled everywhere
- [ ] Unused resources identified and removed
