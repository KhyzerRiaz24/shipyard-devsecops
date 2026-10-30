# Turn the implementation into interview evidence

The value of this project comes from explaining its decisions and showing observed behaviour. Be precise about which parts ran locally and which ran in AWS.

For the ready-to-copy project entry and post draft, see [LinkedIn wording](linkedin.md).

## A short demonstration

1. Open the four pages and explain how React reaches Express through Nginx.
2. Record a release, reload, recreate a container, and show that the entry survives.
3. Send a write with an invalid token and show the rejection.
4. Run the tests and explain why readiness differs from liveness.
5. Show a successful Jenkins run, a blocked vulnerable build, and a reviewed image promotion once your remote services are configured.
6. Introduce a controlled failed release and demonstrate recovery through Git.
7. Show actual request metrics and an isolated backup restoration.

## Useful evidence

Save screenshots and results with UTC timestamps, source commit, tool versions, environment, request count, concurrency, and relevant limitations. `scripts/load-test.mjs` produces a real read-only benchmark in `evidence/`. It is not a production-capacity estimate.

Record start/end times for deployment and recovery. Report the time you measured rather than a target you hoped to meet. Note whether warm caches, local networking, one database member or missing TLS affect the result.

## Questions to be ready for

- Why is Jenkins allowed to publish images but not administer the cluster?
- What happens if Argo CD and a manual rollback disagree?
- How do you prevent a request reaching an API pod before MongoDB is ready?
- Why are a retained EBS volume, a backup and a highly available database different things?
- What changes when there are multiple API replicas and an in-memory rate limiter?
- What risks remain with a shared write token?
- Why use EKS Auto Mode here, and what would you change for a team already using standard managed node groups?
- How would you prove a security scan actually blocks a bad release?

## CV wording

Describe verified work in your own words. Before cloud execution, say “built and tested locally; authored AWS/GitOps deployment configuration.” After a successful cloud deployment and recovery drill, update the wording and attach measured results. Credit the source tutorial as inspiration and identify the implementation decisions you can defend.
