# A lock on which account this state may be applied to.
#
# Maykon has a second AWS account, shared with a business partner, and the
# failure mode worth engineering against is not a wrong resource — it is a
# right resource in the wrong account. Credentials on a laptop are ambient:
# whichever profile happens to be exported is the one Terraform uses, and it
# will happily create three CloudFront distributions somewhere they do not
# belong and bill somebody else for them.
#
# So the plan refuses to run unless the caller is the account named in
# terraform.tfvars, which is gitignored and never leaves this machine. There is
# no default: forgetting to set it fails loudly rather than guessing.

variable "expected_account_id" {
  type        = string
  description = "The personal AWS account this stack belongs to. Set in terraform.tfvars. Applying against any other account is refused."

  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id))
    error_message = "An AWS account id is exactly twelve digits."
  }
}

# A precondition, not a check block. `check` produces a warning and lets the
# apply proceed, which is worse than nothing here: it would print a caution
# about the wrong account and then create everything in it anyway. A failing
# precondition stops the plan.
resource "terraform_data" "account_guard" {
  input = var.expected_account_id

  lifecycle {
    precondition {
      condition = data.aws_caller_identity.current.account_id == var.expected_account_id
      error_message = format(
        "Refusing to run. These credentials belong to account %s and this stack belongs to %s. Check which AWS profile is exported before trying again.",
        data.aws_caller_identity.current.account_id,
        var.expected_account_id,
      )
    }
  }
}

output "account_in_use" {
  description = "Printed on every plan, so the account is never a guess."
  value       = data.aws_caller_identity.current.account_id
}
