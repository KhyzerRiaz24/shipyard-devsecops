# These are nonsecret coordinates for Jenkins and kubectl; no credentials are output.
output "cluster_name" { value = aws_eks_cluster.main.name }
output "region" { value = var.aws_region }
output "repositories" { value = { for k, r in aws_ecr_repository.app : k => r.repository_url } }
output "publisher_policy_arn" { value = aws_iam_policy.publisher.arn }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
