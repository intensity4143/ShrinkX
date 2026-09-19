ShrinkX — Distributed URL Shortener & Analytics Platform

<!-- At 200 concurrent VUs, Redis caching increased redirect throughput from ~5.7K RPS to ~8.4K RPS (~48% improvement), while reducing average latency from 35.1 ms to 23.7 ms and p95 latency from 44.0 ms to 33.8 ms, with 0% errors in both tests. -->

                     PostgreSQL
                         ↓
                    ~5.7K RPS
                         ↓
                  Identify bottleneck
                         ↓
                    Add Redis
                         ↓
                     Redis HIT
                         ↓
                    ~8.4K RPS

<!-- "I first benchmarked the redirect path against PostgreSQL. Under 200 VUs, I observed roughly 5.7K RPS. I introduced Redis using a cache-aside strategy for the short-code-to-original-URL mapping. With the same load, throughput increased to roughly 8.4K RPS and p95 latency dropped from about 44 ms to 34 ms." -->


Frontend
   │
   │ Generate short URL
   ▼
Express API
   │
   ├── PostgreSQL → URL data
   └── Redis → caching
       
User visits short URL
   │
   ▼
Redirect controller
   │
   └── Kafka Producer
          │
          ▼
   analytics-events
          │
          ▼
   Kafka Consumer
          │
          ▼
   analytics_events (PostgreSQL)
          │
          ▼
   Analytics API
          │
          ▼
      Frontend





      Generate URL
     ↓
PostgreSQL + Redis
     ↓
Short URL
     ↓
Redirect
     ↓
Redis
     ↓
Kafka event
     ↓
Consumer
     ↓
analytics_events
     ↓
Analytics dashboard
                         ┌──────────────┐
                         │   Frontend   │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Backend    │
                         │  Node/Express│
                         └──┬───┬───┬───┘
                            │   │   │
                ┌───────────┘   │   └───────────┐
                ▼               ▼               ▼
          PostgreSQL          Redis           Kafka
                ▲                               │
                │                               ▼
                │                    ┌──────────────────┐
                └────────────────────│ Analytics Consumer│
                                     └──────────────────┘


<!-- And if you change your Dockerfile or dependencies: -->
docker compose up -d --build



Load-tested the URL generation API with 200 concurrent virtual users, achieving ~2,575 successful requests/sec with 100% request success and 95th-percentile latency of ~92 ms in a local environment.;Yes. You have enough from this test to move forward. You don't need to keep squeezing the benchmark right now.

Your current baseline is:

200 VUs
20 seconds
51,597 requests
100% successful
~2,575 req/s
p95 ≈ 91.8 ms
max ≈ 180 ms|;


And under 200 VUs for 20 seconds / 62,503 requests, you got:

3,120 RPS
0% request failures
100% 302 responses
Analytics events successfully processed

That's a meaningful baseline for ShrinkX.;Where ShrinkX stands now

You have:

✅ PostgreSQL
✅ Redis caching
✅ Redis rate limiting
✅ Kafka event pipeline
✅ Asynchronous analytics processing
✅ Analytics APIs/dashboard
✅ Dockerized backend
✅ Dockerized consumer
✅ Dockerized infrastructure
✅ End-to-end load testing
✅ Measured performance
✅ Persistent Docker volumes;


Your failure-testing results so far
Failure	User-facing API	Analytics	Recovery
Redis down	Redis-dependent operations affected; rate limiter fails open	Kafka still worked	Redis reconnects
Kafka down	Generate + redirect worked	Producer couldn't publish events during outage	Kafka recovery
Consumer down	Generate + redirect worked	Kafka retained pending events	Consumer caught up after restart;Failure testing status



You've now tested the major components:

Failure	Result
Redis down	Backend stayed alive; Redis-dependent operations degraded
Redis restored	Recovered
Kafka down	Generate + redirect continued
Kafka restored	Recovered
Consumer down	Kafka retained messages; consumer caught up
PostgreSQL down	Cached redirects continued through Redis
Backend process crash	Docker recovered it and API came back;



What I'd postpone until after deployment
Feature	When
Graceful shutdown	After deployment
More Redis failure handling	After deployment
More Kafka reliability	After deployment
Prometheus + Grafana	Later, as you requested
Advanced security hardening	Before calling it fully production-hardened
Final HLD/documentation	After deployment + hardening


My recommendation: a small cloud VPS

Deploy ShrinkX like:

                    Internet
                       │
                       ▼
                ┌─────────────┐
                │   Nginx     │
                │ TLS / HTTPS │
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
                │   Backend   │
                │   Docker    │
                └──┬──┬───┬───┘
                   │  │   │
             ┌─────┘  │   └─────┐
             ▼        ▼         ▼
         PostgreSQL Redis      Kafka
                            │
                            ▼
                         Consumer