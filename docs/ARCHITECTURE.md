# ShrinkX --- Distributed URL Shortener & Analytics Platform

ShrinkX is a production-oriented URL shortener built to explore backend
scalability, distributed systems, caching, asynchronous processing,
deployment, performance engineering, and failure handling.

The project evolved from a basic URL shortener into a distributed
backend using PostgreSQL, Redis, Kafka, rate limiting, Docker,
cloud-managed infrastructure, analytics, load testing, and failure
testing.

> **Core philosophy:** Build → measure → identify a bottleneck or
> failure mode → introduce the appropriate solution → test again →
> document the trade-off.

------------------------------------------------------------------------

## Features

-   Generate short URLs using Base62 encoding
-   Redirect short URLs to original URLs
-   Redis caching for fast redirects
-   Redis-based rate limiting
-   PostgreSQL persistence
-   Duplicate long-URL detection
-   Asynchronous click analytics through Kafka
-   Analytics dashboard
-   Click-over-time analytics
-   Top URL analytics
-   Recent activity
-   Per-URL analytics
-   Dockerized application/infrastructure
-   Cloud deployment
-   k6 load testing
-   Failure testing for Redis, Kafka, PostgreSQL, the consumer, and the
    backend
-   Production-style layered backend architecture

------------------------------------------------------------------------

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [High-Level Architecture](#high-level-architecture)
- [Core Request Flow](#core-request-flow)
- [Redis Caching](#redis-caching)
- [Rate Limiting](#rate-limiting)
- [PostgreSQL](#postgresql)
- [Base62 Encoding](#base62-encoding)
- [Kafka Analytics Pipeline](#kafka-analytics-pipeline)
- [Analytics APIs](#analytics-apis)
- [Backend Architecture](#backend-architecture)
- [Folder Structure](#folder-structure)
- [Docker](#docker)
- [Cloud Deployment](#cloud-deployment)
- [Performance Testing](#performance-testing)
- [Failure Testing](#failure-testing)
- [Resilience Model](#resilience-model)
- [Design Trade-offs](#important-design-trade-offs)
- [Security](#security-considerations)
- [Observability](#observability)
- [Local Development](#local-development)
- [Future Improvements](#future-improvements)

# Overview

ShrinkX provides two primary operations:

1. Convert a long URL into a compact short code.
2. Redirect a short code to its original URL.

The system also records redirect activity asynchronously and exposes analytics through a dedicated API.

The architecture is intentionally designed around the difference between the **latency-sensitive redirect path** and the **asynchronous analytics path**.

The core system consists of:

```text
                    ┌───────────────────┐
                    │      Browser      │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ React + Vite      │
                    │    Frontend       │
                    └─────────┬─────────┘
                              │ REST
                              ▼
                    ┌───────────────────┐
                    │ Node.js + Express │
                    │      Backend      │
                    └─────────┬─────────┘
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
           ┌───────┐     ┌───────────┐   ┌─────────┐
           │ Redis │     │PostgreSQL │   │  Kafka  │
           └───────┘     └───────────┘   └────┬────┘
                                               │
                                               ▼
                                         ┌──────────┐
                                         │ Consumer │
                                         └────┬─────┘
                                              │
                                              ▼
                                         PostgreSQL
```

---

# Tech Stack

## Frontend

-   React
-   Vite
-   Tailwind CSS
-   JavaScript
-   React Router

The frontend provides the URL-shortening interface and analytics
dashboard.

## Backend

-   Node.js
-   Express.js
-   PostgreSQL
-   `pg`
-   Redis
-   `ioredis`
-   Apache Kafka
-   KafkaJS
-   REST APIs

## Infrastructure / DevOps

-   Docker
-   Docker Compose
-   Render
-   Vercel
-   Neon PostgreSQL
-   Upstash Redis
-   Aiven Apache Kafka

## Testing

-   k6
-   Docker-based load testing
-   Failure / resilience testing

------------------------------------------------------------------------

# High-Level Architecture

``` mermaid
flowchart LR
    U[User / Browser]
    FE[Vercel - React + Vite]
    BE[Render - Node.js + Express]
    R[(Upstash Redis)]
    DB[(Neon PostgreSQL)]
    K[(Aiven Kafka)]
    C[Kafka Consumer]

    U --> FE
    FE -->|REST API| BE
    BE -->|Cache / Rate Limit| R
    BE -->|Persistent Data| DB
    BE -->|Analytics Events| K
    K --> C
    C -->|Insert Analytics Events| DB
```

------------------------------------------------------------------------

# Core Request Flow

## Generate Short URL

``` text
Client
  |
  v
POST /api/generate
  |
  v
Rate Limiter
  |
  v
Redis: url:long:<originalUrl>
  |
  +-- Hit --> return existing short code
  |
  +-- Miss
       |
       v
     PostgreSQL lookup
       |
       +-- Exists --> cache + return
       |
       v
     PostgreSQL identity/sequence ID
       |
       v
     Base62 encoding
       |
       v
     Insert URL
       |
       v
     Cache both mappings
       |
       v
     Return short code
```

## Redirect

``` text
Client
  |
  v
GET /:shortCode
  |
  v
Rate Limiter
  |
  v
Redis: url:short:<shortCode>
  |
  +-- Hit --> 302 Redirect
  |              |
  |              +--> Kafka analytics event
  |
  +-- Miss
       |
       v
     PostgreSQL
       |
       +-- Not found --> 404
       |
       v
     Populate Redis
       |
       v
     302 Redirect
       |
       +--> Kafka analytics event
```

------------------------------------------------------------------------

# Redis Caching

ShrinkX maintains two important Redis mappings.

### Long URL → Short Code

``` text
url:long:<originalUrl> -> <shortCode>
```

Used during generation to quickly detect previously shortened URLs.

### Short Code → Original URL

``` text
url:short:<shortCode> -> <originalUrl>
```

Used during redirects because redirect traffic is read-heavy.

The current cache TTL is:

``` text
1800 seconds
```

The implementation follows a cache-aside pattern:

``` text
Redis lookup
   |
   +-- Hit --> return
   |
   +-- Miss
         |
         v
       PostgreSQL
         |
         v
       Populate Redis
```

------------------------------------------------------------------------

# Rate Limiting

The application uses a Redis fixed-window rate limiter based on `INCR`
and `EXPIRE`.

Conceptually:

``` text
INCR rate:<operation>:<ip>
        |
        +-- first request --> EXPIRE
        |
        +-- within limit --> continue
        |
        +-- over limit ---> HTTP 429
```

Different limits can be configured for different operations.

### Failure behavior

The rate limiter is intentionally **fail-open**:

``` text
Redis unavailable
      |
      v
Rate limiter error
      |
      v
Request continues
```

This prevents Redis from becoming a hard dependency for API
availability.

Trade-off: rate limiting cannot be enforced while Redis is unavailable.

------------------------------------------------------------------------

# PostgreSQL

PostgreSQL is the persistent source of truth.

## URLs

``` sql
CREATE TABLE urls (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    original_url TEXT NOT NULL,
    short_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The unique `short_code` constraint also provides an index for lookups.

## Analytics Events

``` sql
CREATE TABLE analytics_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    short_code VARCHAR(20) NOT NULL,
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_short_code
ON analytics_events(short_code);
```

The analytics event table intentionally does not use a foreign key to
`urls`, keeping the asynchronous event log independent from URL
lifecycle operations.

------------------------------------------------------------------------

# Base62 Encoding

Short codes are generated from database-generated numeric IDs and
encoded using:

``` text
0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
```

Base62 provides a compact representation while avoiding random-code
collision checks.

For example:

``` text
PostgreSQL ID
     |
     v
Base62 encoder
     |
     v
Short code
```

A six-character Base62 space contains approximately:

``` text
62^6 ≈ 56.8 billion
```

------------------------------------------------------------------------

# Kafka Analytics Pipeline

Analytics processing is separated from the latency-sensitive redirect
path.

``` text
Redirect
   |
   +--> immediate HTTP response
   |
   +--> Kafka event
           |
           v
    analytics-events
           |
           v
       Consumer
           |
           v
     PostgreSQL
```

Topic:

``` text
analytics-events
```

Consumer group:

``` text
analytics-group
```

Example event:

``` json
{
  "shortCode": "abc123",
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```

The redirect path does not wait for the analytics database insert.

### Why Kafka?

Kafka provides a separate event-processing pipeline with:

-   Decoupling between API and analytics
-   Event retention
-   Consumer-side independent processing
-   Ability to catch up after consumer downtime
-   A foundation for additional consumers
-   Less analytics work inside the redirect request

A non-blocking database call alone is not the same architectural
boundary as a durable event stream.

------------------------------------------------------------------------

# Analytics APIs

The backend exposes:

``` text
GET /api/analytics/overview
GET /api/analytics/clicks-over-time
GET /api/analytics/top-urls
GET /api/analytics/recent-activity
GET /api/analytics/url-overview/:shortCode
```

The dashboard can show:

-   Total URLs
-   Total clicks
-   Today's clicks
-   Last 7 days' clicks
-   Clicks over time
-   Top URLs
-   Recent activity
-   Per-URL statistics

The click-over-time query uses PostgreSQL `generate_series` so dates
with zero clicks can still be returned.

------------------------------------------------------------------------

# API Overview

## Generate URL

``` http
POST /api/generate
Content-Type: application/json
```

Request:

``` json
{
  "originalUrl": "https://example.com"
}
```

## Redirect

``` http
GET /:shortCode
```

Successful redirects use:

``` text
302 Found
```

## Analytics

``` text
GET /api/analytics/overview
GET /api/analytics/clicks-over-time
GET /api/analytics/top-urls
GET /api/analytics/recent-activity
GET /api/analytics/url-overview/:shortCode
```

------------------------------------------------------------------------

# Backend Architecture

The backend follows a layered structure:

``` text
Routes
  |
  v
Controllers
  |
  v
Services
  |
  v
Repositories
  |
  v
Database
```

### Routes

Map HTTP endpoints to controllers.

### Controllers

Handle HTTP-specific concerns:

-   Request data
-   Calling services
-   HTTP responses

### Services

Contain business logic:

-   Cache lookup
-   URL generation
-   Base62 encoding
-   Cache population
-   Analytics event publishing

### Repository

Contains database operations and SQL queries.

This separation keeps business logic independent from HTTP and
persistence details.

------------------------------------------------------------------------

# Folder Structure

``` text
url-shortener/
│
├── backend/
│   ├── certs/
│   │   └── aiven-ca.pem
│   ├── config/
│   │   ├── database.js
│   │   ├── kafka.js
│   │   └── redis.js
│   ├── controllers/
│   ├── kafka/
│   ├── middleware/
│   ├── repository/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── consumer.js
│   ├── server.js
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── load-testing/
│   └── generate-test.js
│
├── .env
├── .gitignore
├── docker-compose.yml
├── README.md
└── ...
```

> Secret files, `.env` files, and `node_modules` should not be
> committed.

------------------------------------------------------------------------

# Docker

The backend uses Node.js 22 Alpine.

``` dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

Docker Compose was used during local development for infrastructure such
as PostgreSQL, Redis, and Kafka.

Docker provides reproducible environments, service isolation, and
production-like packaging.

------------------------------------------------------------------------

# Environment Variables

Never commit real credentials.

Example:

``` env
NODE_ENV=production

DATABASE_URL=your_neon_postgresql_url
REDIS_URL=your_upstash_redis_url

KAFKA_BROKER=your_aiven_kafka_host:port
KAFKA_USERNAME=your_kafka_username
KAFKA_PASSWORD=your_kafka_password
KAFKA_CA_PATH=/etc/secrets/aiven-ca.pem

FRONTEND_URL=https://your-frontend.vercel.app
```

For cloud deployment, the Aiven CA certificate is provided through a
secret-file mechanism rather than committed to Git.

------------------------------------------------------------------------

# Cloud Deployment

  Component          Service
  ------------------ ---------
  Frontend           Vercel
  Backend API        Render
  PostgreSQL         Neon
  Redis              Upstash
  Kafka              Aiven
  Kafka Consumer     Render
  Containerization   Docker

Architecture:

``` text
                 Internet
                    |
          +---------+---------+
          |                   |
          v                   v
       Vercel              Render
      Frontend            Backend API
                              |
               +--------------+--------------+
               |              |              |
               v              v              v
            Upstash          Neon           Aiven
             Redis         PostgreSQL       Kafka
                                             |
                                             v
                                      Kafka Consumer
                                             |
                                             v
                                         Neon DB
```

The backend uses `process.env.PORT`, allowing the hosting platform to
provide the runtime port.

------------------------------------------------------------------------

# Performance Testing

Load testing was performed with **k6**.

The goal was to establish real baselines rather than invent performance
numbers.

## Dockerized Generate Benchmark

Configuration:

``` text
200 VUs
20 seconds
0% errors
```

Measured:

  Metric                    Result
  ----------------- --------------
  Requests                  51,597
  Throughput          2,574.56 RPS
  Average latency         77.51 ms
  Median latency          75.30 ms
  p95 latency             91.80 ms
  Maximum latency        179.87 ms
  Error rate                    0%

Endpoint:

``` text
POST /api/generate
```

## Dockerized Redirect Benchmark

Configuration:

``` text
200 VUs
20 seconds
0% errors
```

Measured:

  Metric                     Result
  ------------------ --------------
  Requests                   62,503
  Throughput           3,120.05 RPS
  Average latency          63.94 ms
  Median latency           54.22 ms
  p95 latency             105.72 ms
  Maximum latency         541.96 ms
  Error rate                     0%
  HTTP 302 success             100%

Endpoint:

``` text
GET /:shortCode
```

Analytics events were successfully produced during the redirect load
test.

> These numbers are environment-specific measurements, not universal
> guarantees. Hardware, Docker configuration, database state, network
> conditions, and workload shape can change the results.

------------------------------------------------------------------------

# Earlier Load-Test Baseline

Before the final Dockerized tests, the API was tested with increasing
concurrency:

    VUs   Approx. RPS   Avg. Latency           p95
  ----- ------------- -------------- -------------
     10       \~1,977      \~4.97 ms     \~6.79 ms
     50       \~1,985     \~25.07 ms    \~29.83 ms
    100       \~2,009     \~49.63 ms    \~55.98 ms
    200       \~2,011     \~99.17 ms   \~124.49 ms

These tests had 0% errors.

The later Dockerized benchmarks are the more relevant final
local-container baseline.

------------------------------------------------------------------------

# Failure Testing

The project was deliberately tested by taking individual dependencies
offline.

## Redis Failure

Observed:

``` text
Redis unavailable
    |
    +--> cache operations fail
    +--> rate limiter fails
    +--> rate limiter fails open
    +--> backend remains alive
```

Impact:

-   Caching becomes unavailable.
-   Rate limiting cannot be enforced.
-   PostgreSQL becomes more important for cache misses.

## Kafka Failure

Observed:

``` text
Kafka unavailable
    |
    +--> URL generation continues
    +--> redirects continue
    +--> analytics events may be lost
```

Analytics publishing is intentionally fire-and-forget.

This prioritizes user-facing redirect availability and latency over
guaranteed analytics delivery during a Kafka outage.

## Kafka Consumer Failure

Observed:

``` text
Consumer offline
    |
    v
Kafka retains events
    |
    v
Consumer reconnects
    |
    v
Consumer processes available events
    |
    v
PostgreSQL
```

This demonstrates the decoupling between event production and event
consumption.

## PostgreSQL Failure

Observed:

-   Cached redirects can continue through Redis.
-   New URL generation requires PostgreSQL and fails.
-   Cache-miss redirects require PostgreSQL and fail.
-   Analytics persistence requires PostgreSQL.

## Backend Failure

The backend process was terminated and restarted in the containerized
environment. With the configured restart behavior, the backend became
available again after process termination.

------------------------------------------------------------------------

# Resilience Model

ShrinkX deliberately treats dependencies differently:

``` text
                  Backend
                 /   |                   /    |                   v     v     v
            Redis   DB    Kafka
              |      |      |
            cache  source  analytics
              |      |      |
           optional  core  async
```

-   **Redis:** performance/cache dependency
-   **PostgreSQL:** persistence dependency
-   **Kafka:** analytics/event-processing dependency

Not every dependency needs identical failure semantics.

------------------------------------------------------------------------

# Important Design Trade-offs

### Redis is not the source of truth

Redis improves performance, while PostgreSQL remains the persistent
source of truth.

### Kafka analytics is asynchronous

Analytics processing is kept out of the critical redirect path.

### Kafka outage can lose analytics events

The producer is fire-and-forget. This is an explicit
availability/latency trade-off.

### Rate limiting is fail-open

The API can continue operating during Redis failure, at the cost of
temporarily losing enforcement.

### No unnecessary distributed database complexity

The project does not currently use sharding, multi-region databases, or
distributed ID generation because its current scope does not require
them.

------------------------------------------------------------------------

# Security Considerations

Current implementation includes:

-   Rate limiting
-   Environment-based secrets
-   Kafka TLS
-   Kafka SASL/SCRAM authentication
-   CORS configuration
-   Docker isolation
-   Secret-file handling for the Kafka CA certificate
-   No real credentials committed to Git

Potential future improvements:

-   Authentication and authorization
-   Stronger URL validation
-   Security headers
-   Centralized structured logging
-   Secret rotation
-   More granular rate limiting
-   Abuse detection
-   Dead-letter handling for failed analytics events

------------------------------------------------------------------------

# Observability

Observability is the next infrastructure layer planned for the project.

Planned stack:

``` text
Application
    |
    v
Metrics
    |
    v
Prometheus
    |
    v
Grafana
```

Potential metrics:

-   Request rate
-   Request latency
-   Error rate
-   Redis failures
-   Kafka producer/consumer health
-   Database pool behavior
-   Process health
-   Resource utilization

Observability was intentionally postponed until the core architecture,
deployment, performance testing, and failure testing were complete.

------------------------------------------------------------------------

# Local Development

Clone:

``` bash
git clone https://github.com/intensity4143/url_shortener.git
cd url_shortener
```

Backend:

``` bash
cd backend
npm install
npm run dev
```

Frontend:

``` bash
cd frontend
npm install
npm run dev
```

Docker infrastructure:

``` bash
docker compose up -d
```

Stop:

``` bash
docker compose down
```

Load testing:

``` bash
k6 run load-testing/generate-test.js
```

------------------------------------------------------------------------

# What This Project Demonstrates

ShrinkX demonstrates practical experience with:

-   REST API design
-   Layered backend architecture
-   PostgreSQL schema design
-   Database connection pooling
-   Redis caching
-   Cache-aside architecture
-   Rate limiting
-   Base62 encoding
-   Event-driven architecture
-   Kafka producers and consumers
-   Asynchronous processing
-   Docker
-   Cloud deployment
-   Managed infrastructure
-   Load testing
-   Performance analysis
-   Failure testing
-   Resilience engineering
-   Backend scalability concepts

The project is intentionally focused on understanding **why**
infrastructure is introduced, not simply collecting technologies.

``` text
Build
  ↓
Measure
  ↓
Find bottleneck / failure mode
  ↓
Introduce solution
  ↓
Test again
  ↓
Document trade-offs
```

------------------------------------------------------------------------

# Future Improvements

Possible next steps:

1.  Prometheus metrics
2.  Grafana dashboards
3.  Structured logging
4.  Distributed tracing
5.  Better Kafka delivery guarantees
6.  Dead-letter handling
7.  More advanced rate limiting
8.  Database read replicas
9.  Horizontal backend scaling
10. Nginx / reverse proxy
11. Custom domain
12. HTTPS
13. Oracle Cloud deployment
14. More advanced failure injection
15. Automated CI/CD
16. Health-check endpoints
17. Graceful shutdown
18. Distributed ID generation for multi-database scaling

------------------------------------------------------------------------

# Repository

GitHub:

https://github.com/intensity4143/url_shortener

------------------------------------------------------------------------

# Author

**Pintu Kumar**

B.Tech Computer Science --- KIET Group of Institutions

GitHub: `intensity4143`

------------------------------------------------------------------------

## License

Add the project's chosen license here when one is selected.
