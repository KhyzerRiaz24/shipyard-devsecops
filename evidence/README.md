# Evidence directory

Keep observed results here. Generated JSON reports are ignored by default so that targets and operational metadata are not published accidentally. Review, redact if needed, then deliberately add reports you want to share.

`node scripts/load-test.mjs http://localhost:8080 200` measures real reads at concurrency 10, counts failed requests, and saves p50/p95 client latency. It does not measure production capacity or Jenkins deployment success.

For each cloud exercise, record source SHA, image digest, AWS region, cluster/chart versions, UTC times, commands, observed outcome and limitations. Store no tokens, passwords, connection URLs or Terraform state here.
