# What the human signs in as.
#
# The honest shape for a one-person account is AdministratorAccess with fences
# around it, not a hand-written least-privilege policy. This stack creates IAM
# roles and policies, so any policy narrow enough to be interesting is also
# narrow enough to fail halfway through an apply — and a policy that can create
# roles can escalate to admin anyway. The deploys themselves do not use this
# principal at all; they assume the OIDC role from GitHub.
#
# The two fences are what make that defensible:
#
#   1. Nothing works without MFA.
#   2. An explicit Deny on the service families this account will never use.
#      Explicit Deny beats any Allow, including AdministratorAccess, so this is
#      a structural limit rather than an alert. It is also the cheapest possible
#      answer to "make it impossible to overspend": the services that produce
#      frightening bills are simply unavailable.
#
# Bootstrap order: create the principal in the console with AdministratorAccess
# so there is something to run Terraform as, then apply this and let it attach
# the fences. Chicken and egg, resolved once.

variable "human_principal_arns" {
  type        = list(string)
  default     = []
  description = <<-TEXT
    IAM users or roles used by a person, which the fences attach to. Leave empty
    until the principal exists. For IAM Identity Center this is the permission
    set's provisioned role, which is named AWSReservedSSO_<PermissionSet>_<hash>.
  TEXT
}

variable "attach_mfa_fence" {
  type        = bool
  default     = true
  description = <<-TEXT
    Attach the MFA fence. Leave it on, but read this first, because it breaks
    the obvious way of running Terraform.

    aws:MultiFactorAuthPresent is not set at all on a long-lived IAM access
    key, and BoolIfExists treats an absent key as a match — so the Deny fires
    and an access key pair is refused everything. That is the intended
    behaviour of the fence, not a bug in it, but it means `terraform apply`
    with plain keys in the environment will fail on every call.

    The fix is temporary credentials that carry the MFA context:

      aws sts get-session-token \
        --serial-number arn:aws:iam::<account>:mfa/<device> \
        --token-code <six digits> --duration-seconds 43200

    and export the three values it returns. IAM Identity Center avoids the
    problem entirely, which is the strongest argument for it over an IAM user.
  TEXT
}

# --- Fence 1: no MFA, no access -------------------------------------------
# Nothing at all, including read, unless the session was authenticated with a
# second factor. The exception is the handful of calls somebody needs in order
# to enrol a device in the first place, otherwise a fresh principal is locked
# out of fixing its own lockout.
data "aws_iam_policy_document" "require_mfa" {
  statement {
    sid    = "AllowManagingOwnMFA"
    effect = "Allow"
    actions = [
      "iam:CreateVirtualMFADevice", "iam:EnableMFADevice",
      "iam:ResyncMFADevice", "iam:DeleteVirtualMFADevice",
      "iam:ListMFADevices", "iam:ListVirtualMFADevices",
      "iam:GetUser", "iam:ChangePassword", "sts:GetCallerIdentity",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "DenyEverythingElseWithoutMFA"
    effect = "Deny"
    not_actions = [
      "iam:CreateVirtualMFADevice", "iam:EnableMFADevice",
      "iam:ResyncMFADevice", "iam:DeleteVirtualMFADevice",
      "iam:ListMFADevices", "iam:ListVirtualMFADevices",
      "iam:GetUser", "iam:ChangePassword", "sts:GetCallerIdentity",
    ]
    resources = ["*"]

    condition {
      test     = "BoolIfExists"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["false"]
    }
  }
}

# --- Fence 2: the services this account has no business using --------------
# Everything here is a service that either bills by the hour or bills by the
# gigabyte, and none of it is used by three static sites. Denying them turns
# "I hope I do not leave something running" into a thing that cannot happen.
#
# If a real need appears — Lambda@Edge is the plausible one, since CloudFront
# Functions cover most cases but not all — remove it from this list
# deliberately, in a commit, rather than by clicking around at the time.
data "aws_iam_policy_document" "cost_fence" {
  statement {
    sid    = "DenyServicesThisAccountDoesNotUse"
    effect = "Deny"
    actions = [
      "ec2:*", "rds:*", "eks:*", "ecs:*", "elasticache:*",
      "redshift:*", "emr:*", "elasticmapreduce:*", "sagemaker:*",
      "bedrock:*", "opensearch:*", "es:*", "neptune-db:*",
      "kafka:*", "kinesis:*", "glue:*", "athena:*", "quicksight:*",
      "lightsail:*", "batch:*", "workspaces:*", "appstream:*",
      "globalaccelerator:*", "transfer:*", "fsx:*", "storagegateway:*",
      "connect:*", "chime:*", "mediaconvert:*", "medialive:*",
      "lambda:CreateFunction", "lambda:UpdateFunctionCode",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "require_mfa" {
  name        = "require-mfa"
  description = "Nothing works without a second factor."
  policy      = data.aws_iam_policy_document.require_mfa.json
}

resource "aws_iam_policy" "cost_fence" {
  name        = "cost-fence"
  description = "Explicit deny on service families this account will never use. Beats AdministratorAccess."
  policy      = data.aws_iam_policy_document.cost_fence.json
}

# Attaching to a role and to a user needs different resources, so the list is
# split by ARN shape rather than making the reader remember which is which.
locals {
  human_users = [for arn in var.human_principal_arns : split("/", arn)[length(split("/", arn)) - 1] if can(regex(":user/", arn))]
  human_roles = [for arn in var.human_principal_arns : split("/", arn)[length(split("/", arn)) - 1] if can(regex(":role/", arn))]
}

resource "aws_iam_user_policy_attachment" "fences_user" {
  for_each = toset(flatten([
    for u in local.human_users : concat(["${u}|fence"], var.attach_mfa_fence ? ["${u}|mfa"] : [])
  ]))
  user       = split("|", each.value)[0]
  policy_arn = endswith(each.value, "|mfa") ? aws_iam_policy.require_mfa.arn : aws_iam_policy.cost_fence.arn
}

resource "aws_iam_role_policy_attachment" "fences_role" {
  for_each = toset(flatten([
    for r in local.human_roles : concat(["${r}|fence"], var.attach_mfa_fence ? ["${r}|mfa"] : [])
  ]))
  role       = split("|", each.value)[0]
  policy_arn = endswith(each.value, "|mfa") ? aws_iam_policy.require_mfa.arn : aws_iam_policy.cost_fence.arn
}
