output "nameservers" {
  description = "Point these four at GoDaddy to delegate DNS to Route 53."
  value       = aws_route53_zone.root.name_servers
}

output "deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE in the GitHub repository."
  value       = aws_iam_role.deployer.arn
}

output "sites" {
  value = {
    root   = { bucket = module.root_site.bucket, distribution = module.root_site.distribution_id }
    maykon = { bucket = module.maykon_site.bucket, distribution = module.maykon_site.distribution_id }
    manu   = { bucket = module.manu_site.bucket, distribution = module.manu_site.distribution_id }
  }
}
