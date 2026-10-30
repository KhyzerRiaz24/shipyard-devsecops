# Operations and failure exercises

Run local commands from the repository root. Before cluster commands, inspect `kubectl config current-context`. Do exercises only in a disposable demo environment and record the actual observations.

## Local startup or connection failure

```bash
docker compose ps
docker compose logs --tail=50 mongo api web
curl --fail http://localhost:8080/health/ready
```

MongoDB must become healthy before the API starts; the API must become healthy before the gateway starts. If authentication fails after editing `.env`, restore the credentials matching the initialized database. The init script does not rerun against existing data.

## Backup and isolated restoration

Create a release entry with a distinctive note, then:

```bash
bash scripts/backup.sh
bash scripts/restore.sh backups/YOUR_ACTUAL_ARCHIVE.archive.gz
```

The backup script writes a compressed MongoDB archive to a private ignored directory, renaming a partial file only after success. The restore script maps `shipyard.*` into a new timestamped database and reports its journal count. It does not overwrite the live database and does not automatically grant the application user access to the restored database.

Compare the restored entries with the source, including IDs and notes. A successful dump alone is not proof of recovery. For an actual cutover, stop writes, verify a complete backup, explicitly grant the application account access to the restored database, and update both the database in the connection URL and the adapter's selected database (currently `client.db('shipyard')`). Review/test that change before resuming writes. This demo intentionally avoids an automatic destructive cutover.

The provided scripts target Compose. For Kubernetes, stream `mongodump` through `kubectl exec -i mongo-0` into a protected external archive using the mounted database credentials; do not save the only backup on the same EBS volume. A durable off-cluster backup schedule, retention, encryption and restore drill are required before any production claim.

## API readiness during database interruption

Keep the Compose gateway running and stop only MongoDB:

```bash
docker compose stop mongo
curl --include http://localhost:8080/health/live
curl --include http://localhost:8080/health/ready
docker compose start mongo
```

Expected behaviour: liveness remains 200; readiness returns 503 while MongoDB is unavailable. The API's database operation can take a few seconds to time out. After MongoDB returns, the driver's connection pool reconnects; verify journal reads and readiness recover. Do not claim a specific recovery time until you measure it.

## Persistence after container replacement

Record an entry, then `docker compose up -d --force-recreate mongo api web`. Wait for health and confirm that entry still exists. The named volume, not a container filesystem, preserves the data.

## Failed Kubernetes release and recovery

1. Back up the journal and confirm an existing good deployment is serving.
2. In a disposable demo branch, promote a deliberately broken API image (for example, one with an entry point that exits). Do not merge this into a shared environment accidentally.
3. Observe pods, `kubectl describe deployment api -n shipyard`, events, and the rollout deadline. Verify whether old replicas continue serving; do not assume zero errors.
4. Revert the image-promotion Git commit and merge the correction. Argo CD should reconcile the previous image digest.
5. Wait for rollout success, run readiness/read-write smoke tests, and capture timestamps, logs and error rates.

`maxUnavailable: 0` requires spare capacity for the surge pod and correct health probes. It is not a universal zero-downtime guarantee. A semantic bug can pass readiness. Prefer Git revert to `kubectl rollout undo`, since Argo CD would otherwise reconcile the bad desired state again.

## Credentials

The write token can be rotated by replacing the operator-managed API secret and restarting API pods. The UI never stores it after the modal closes. MongoDB passwords require updating the database user's password and coordinating the API connection secret/restart. Merely changing a Kubernetes Secret or `.env` does not change an existing MongoDB user's password.

Keep the original cluster secrets recovery copy in secure storage. If the secrets bootstrap partially succeeds, inspect which Secrets exist and recover from the saved copy; do not regenerate passwords against an initialized volume.

## Teardown

Local: `docker compose down` stops the app and preserves the named volume. Remove volumes only after reviewing your backup and deciding the data is disposable; the standard command does not delete them.

AWS: disable/delete the Argo CD Application without cascading away database data, remove the optional Ingress first and wait for its ALB to disappear, uninstall management Helm releases, and remove the application workloads. Inspect retained PVs/EBS volumes before removing PVCs. The StorageClass uses `Retain`, so volumes can remain and incur charges after the workload is gone. ECR images must be removed explicitly before Terraform can delete their repositories. Review `terraform plan -destroy` and then run `terraform destroy` only after those decisions. Inspect the account for retained storage, snapshots, ALBs, logs and registries afterwards.
