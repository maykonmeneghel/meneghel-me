# Spending guardrails.
#
# Read this first, because it is the thing people get wrong: AWS has no hard
# spending cap. There is no switch that says "never charge me more than twenty
# dollars". Budgets are alarms, not brakes. What follows is therefore two
# different mechanisms:
#
#   1. Alerts that tell you fast — a zero-spend budget that fires the moment
#      anything at all costs money, a monthly budget with thresholds, and
#      anomaly detection for spend that is out of character.
#   2. One actual brake — a budget action that attaches a Deny policy to the
#      deploy role when a hard ceiling is crossed. It stops new resources being
#      created. It does not stop CloudFront serving traffic that already exists,
#      and nothing in AWS does.
#
# Cost of the guardrails themselves: the first two budgets on an account are
# free and this file creates exactly two. Anomaly detection is free. The
# CloudWatch alarm is inside the ten-alarm free allowance.

variable "alert_email" {
  type        = string
  description = "Where budget alerts go. Set it in terraform.tfvars, which is gitignored — this repository is public."
}

variable "monthly_budget_usd" {
  type        = number
  default     = 5
  description = "What this account is expected to cost. Three static sites should land near one dollar."
}

variable "hard_stop_usd" {
  type        = number
  default     = 25
  description = "The ceiling at which the deploy role loses permission to create anything."
}

# --- 1. The moment anything costs money -------------------------------------
# On a new account inside the free tier the bill should be almost nothing, so
# the useful alarm is not "am I near the budget" but "did something start
# charging me at all". A cent is enough to notice.
resource "aws_budgets_budget" "zero_spend" {
  name         = "zero-spend"
  budget_type  = "COST"
  limit_amount = "0.01"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}

# --- 2. The monthly budget --------------------------------------------------
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-ceiling"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Half, four fifths, all of it — and a forecast alert, which is the one that
  # actually buys you time, because it fires before the money is spent.
  dynamic "notification" {
    for_each = [50, 80, 100]
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.alert_email]
    }
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}

# --- 3. Spend that is out of character --------------------------------------
# Free, and it catches the shape of a problem a fixed threshold misses: a
# service that has never cost anything suddenly costing a little.
# AWS creates a dimensional monitor on every account by default, and allows
# exactly one — so this is consumed rather than created. Creating a second one
# fails with "Limit exceeded on dimensional spend monitor creation", which is a
# confusing way of saying "you already have the only one you are allowed".
#
# Find it with:
#   aws ce get-anomaly-monitors --query 'AnomalyMonitors[?MonitorType==`DIMENSIONAL`].MonitorArn'
#
# There is no data source for it, so the ARN goes in terraform.tfvars.
variable "anomaly_monitor_arn" {
  type        = string
  default     = ""
  description = "ARN of the account's default dimensional anomaly monitor. Leave empty to skip the subscription."
}

resource "aws_ce_anomaly_subscription" "daily" {
  count = var.anomaly_monitor_arn == "" ? 0 : 1

  name      = "anomalies-daily"
  frequency = "DAILY"

  monitor_arn_list = [var.anomaly_monitor_arn]

  subscriber {
    type    = "EMAIL"
    address = var.alert_email
  }

  # One dollar is noise on a large account and a signal on this one.
  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      match_options = ["GREATER_THAN_OR_EQUAL"]
      values        = ["1"]
    }
  }
}

# --- 4. The one real brake --------------------------------------------------
# A budget action can attach a policy when a threshold is crossed. This one
# denies the deploy role the ability to create anything, which stops a runaway
# in its tracks without touching the sites that are already serving.
resource "aws_iam_policy" "deny_create" {
  name        = "budget-hard-stop"
  description = "Attached by AWS Budgets when the hard ceiling is crossed."
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Deny"
      Action = [
        "ec2:RunInstances", "ec2:StartInstances",
        "rds:CreateDBInstance", "rds:CreateDBCluster",
        "eks:CreateCluster", "elasticache:CreateCacheCluster",
        "sagemaker:CreateEndpoint", "sagemaker:CreateNotebookInstance",
        "lambda:CreateFunction", "ecs:RunTask",
        "cloudfront:CreateDistribution", "s3:CreateBucket",
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role" "budget_action" {
  name = "budgets-hard-stop"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "budgets.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "budget_action" {
  role = aws_iam_role.budget_action.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["iam:AttachRolePolicy", "iam:DetachRolePolicy"]
      Resource = aws_iam_role.deployer.arn
    }]
  })
}

resource "aws_budgets_budget_action" "hard_stop" {
  budget_name        = aws_budgets_budget.monthly.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budget_action.arn

  action_threshold {
    action_threshold_type  = "ABSOLUTE_VALUE"
    action_threshold_value = var.hard_stop_usd
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.deny_create.arn
      roles      = [aws_iam_role.deployer.name]
    }
  }

  subscriber {
    address           = var.alert_email
    subscription_type = "EMAIL"
  }
}
