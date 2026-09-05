# Infrastructure

Three static sites on S3, served by CloudFront, with DNS in Route 53.
Registrar stays at GoDaddy; only the nameservers move.

## Why DNS has to move

`meneghel.me` (the apex, with no `www`) must point at CloudFront, and CloudFront
has no fixed IP. Resolving that needs an **ALIAS** record, which GoDaddy does not
support — it offers only `A` records with literal IPs, plus forwarding tricks that
break HTTPS. Route 53 supports ALIAS at the apex natively. The domain registration
itself does not move.

## Order of operations

1. **Create the new AWS account** (separate from the Tradx account).
2. **Bootstrap the state bucket** by hand, once — Terraform cannot create the
   bucket that holds its own state:
   ```sh
   aws s3api create-bucket --bucket meneghel-me-tfstate \
     --region sa-east-1 --create-bucket-configuration LocationConstraint=sa-east-1
   aws s3api put-bucket-versioning --bucket meneghel-me-tfstate \
     --versioning-configuration Status=Enabled
   ```
   Then uncomment the `backend "s3"` block in `main.tf` and `terraform init`.
3. **Apply, in two passes.** The certificate cannot validate until the
   nameservers are live, so the first apply intentionally stops short:
   ```sh
   terraform apply -target=aws_route53_zone.root
   terraform output nameservers
   ```
4. **Delegate at GoDaddy**: replace the four nameservers with the ones printed
   above. Propagation is usually minutes, occasionally a few hours.
5. **Verify delegation before continuing**, or the apply will hang for 45
   minutes waiting on ACM:
   ```sh
   dig +short NS meneghel.me
   ```
6. **Apply the rest**: `terraform apply`.
7. **Wire up GitHub**: set repository secrets `AWS_DEPLOY_ROLE` (from
   `terraform output deploy_role_arn`) and `CF_DIST_ROOT` / `CF_DIST_MAYKON` /
   `CF_DIST_MANU` from `terraform output sites`.

## Gotchas worth knowing before you hit them

- **ACM must be in `us-east-1`.** CloudFront reads certificates from that region
  only, no matter where the rest of the stack lives. Handled here by the
  `aws.us_east_1` provider alias.
- **S3 bucket names are globally unique.** If `meneghel-me` is already taken by
  a stranger, `terraform apply` fails with `BucketAlreadyExists`. Fix by adding a
  suffix in `modules/static-site/main.tf` — the bucket name is never user-visible.
- **CloudFront distributions take 5–15 minutes** to deploy on create and on most
  changes. That is normal, not a hang.
- **Deploying is not the same as being live.** After a sync, CloudFront still
  serves the old HTML until the invalidation completes.

## Cost

Roughly **US$ 0.50–2.00/month**: the Route 53 hosted zone is a flat $0.50, S3
storage for ~50 MB is pennies, and CloudFront traffic for a personal site sits
inside the perpetual free tier. ACM certificates are free.
