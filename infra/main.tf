terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.60" }
  }
  # Fill in after bootstrapping the state bucket (see infra/README.md).
  # backend "s3" {}
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project   = "meneghel-me"
      ManagedBy = "terraform"
    }
  }
}

# CloudFront only accepts certificates issued in us-east-1, regardless of
# where everything else lives. This is the single most common first-time trap.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = {
      Project   = "meneghel-me"
      ManagedBy = "terraform"
    }
  }
}

resource "aws_route53_zone" "root" {
  name    = var.root_domain
  comment = "meneghel.me — delegated from the GoDaddy registrar"
}

resource "aws_acm_certificate" "wildcard" {
  provider                  = aws.us_east_1
  domain_name               = var.root_domain
  subject_alternative_names = ["*.${var.root_domain}"]
  validation_method         = "DNS"

  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for d in aws_acm_certificate.wildcard.domain_validation_options :
    d.domain_name => d
  }
  zone_id         = aws_route53_zone.root.zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "wildcard" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.wildcard.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

module "root_site" {
  source          = "./modules/static-site"
  domain          = var.root_domain
  zone_id         = aws_route53_zone.root.zone_id
  certificate_arn = aws_acm_certificate_validation.wildcard.certificate_arn
}

module "maykon_site" {
  source          = "./modules/static-site"
  domain          = "maykon.${var.root_domain}"
  zone_id         = aws_route53_zone.root.zone_id
  certificate_arn = aws_acm_certificate_validation.wildcard.certificate_arn
}

module "manu_site" {
  source          = "./modules/static-site"
  domain          = "manu.${var.root_domain}"
  zone_id         = aws_route53_zone.root.zone_id
  certificate_arn = aws_acm_certificate_validation.wildcard.certificate_arn
}
