variable "region" {
  type        = string
  default     = "sa-east-1"
  description = "Where the buckets live. CloudFront serves globally regardless."
}

variable "root_domain" {
  type    = string
  default = "meneghel.me"
}

variable "github_repo" {
  type        = string
  description = "owner/repo allowed to assume the deploy role"
  default     = "maykonmeneghel/meneghel-me"
}
