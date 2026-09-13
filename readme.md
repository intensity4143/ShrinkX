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