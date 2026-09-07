# GitHub Actions authenticates by exchanging its OIDC token for this role.
# No access keys are ever created, stored, or rotated.

data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Only this repository, and only on the default branch.
    #
    # GitHub now embeds immutable numeric ids in the subject claim, so what
    # actually arrives is
    #
    #   repo:maykonmeneghel@9310048/meneghel-me@1360146385:ref:refs/heads/main
    #
    # and not the documented-everywhere repo:owner/repo:ref:... form. A policy
    # written against the old shape is denied with "Not authorized to perform
    # sts:AssumeRoleWithWebIdentity", which says nothing about why. The way to
    # find out is CloudTrail: the failed event records the presented subject
    # under userIdentity.principalId.
    #
    # Both shapes are accepted here so this does not break if GitHub varies it,
    # and the ids are pinned rather than wildcarded — they are the reason the
    # claim changed, and they survive a rename, which the names do not.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:ref:refs/heads/main",
        "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo_name}@${var.github_repo_id}:ref:refs/heads/main",
      ]
    }
  }
}

resource "aws_iam_role" "deployer" {
  name               = "meneghel-me-deployer"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

data "aws_iam_policy_document" "deployer" {
  statement {
    actions = ["s3:ListBucket"]
    resources = [
      "arn:aws:s3:::${replace(var.root_domain, ".", "-")}",
      "arn:aws:s3:::maykon-${replace(var.root_domain, ".", "-")}",
      "arn:aws:s3:::manu-${replace(var.root_domain, ".", "-")}",
    ]
  }
  statement {
    actions = ["s3:PutObject", "s3:DeleteObject"]
    resources = [
      "arn:aws:s3:::${replace(var.root_domain, ".", "-")}/*",
      "arn:aws:s3:::maykon-${replace(var.root_domain, ".", "-")}/*",
      "arn:aws:s3:::manu-${replace(var.root_domain, ".", "-")}/*",
    ]
  }
  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = ["arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"]
  }
}

resource "aws_iam_role_policy" "deployer" {
  role   = aws_iam_role.deployer.id
  policy = data.aws_iam_policy_document.deployer.json
}
