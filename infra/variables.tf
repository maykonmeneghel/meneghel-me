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

variable "aws_profile" {
  type        = string
  default     = ""
  description = <<-TEXT
    Named AWS profile to pin this stack to. Set it locally so an exported
    AWS_PROFILE cannot decide which account gets the resources — this laptop
    also holds credentials for an account shared with a business partner, and
    this project belongs to the personal account only.

    Empty means the default credential chain, which is what CI uses.
  TEXT
}
