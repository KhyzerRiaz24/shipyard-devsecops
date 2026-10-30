# Set account-specific nonsecret values in an ignored terraform.tfvars. No AWS keys here.
variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "eu-west-2"
}
variable "project_name" {
  description = "Short prefix for AWS resource names."
  type        = string
  default     = "shipyard"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project_name))
    error_message = "Use 3-20 lowercase letters, digits or hyphens, starting with a letter."
  }
}
variable "kubernetes_version" {
  description = "EKS version verified against the AWS support calendar before apply."
  type        = string
  default     = "1.35"
}
variable "admin_principal_arn" {
  description = "Stable IAM role/user ARN allowed to administer this demo cluster; never an STS session ARN."
  type        = string
  validation {
    condition     = can(regex("^arn:aws:iam::[0-9]{12}:(role|user)/.+$", var.admin_principal_arn))
    error_message = "Supply a stable IAM user or role ARN."
  }
}
variable "api_access_cidrs" {
  description = "Trusted public IP CIDRs for kubectl; e.g. your current IP /32. No world-open endpoint."
  type        = list(string)
  validation {
    condition     = length(var.api_access_cidrs) > 0 && alltrue([for cidr in var.api_access_cidrs : can(cidrnetmask(cidr)) && !endswith(cidr, "/0")])
    error_message = "Provide IPv4 CIDRs, excluding /0."
  }
}
