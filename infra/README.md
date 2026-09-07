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


## Money

AWS has no hard spending cap. There is no switch that says "never charge me
more than twenty dollars", and anybody who tells you otherwise is describing an
alert. `guardrails.tf` is therefore two different things:

**Things that tell you fast.** A zero-spend budget that fires the moment
anything at all costs money — on a new account inside the free tier, the useful
alarm is not "am I near the limit" but "did something start charging me". A
monthly budget with alerts at 50%, 80% and 100% spent, plus a forecast alert,
which is the one that buys time because it fires before the money is gone. And
Cost Anomaly Detection, which catches the shape a fixed threshold misses: a
service that has never cost anything suddenly costing a little.

**One actual brake.** At `hard_stop_usd` a budget action attaches a Deny policy
to the deploy role, so it can no longer create instances, databases, clusters,
functions or buckets. Be clear about what that is: it stops a runaway from
getting worse. It does not stop CloudFront serving traffic that already exists,
because nothing in AWS does.

The guardrails cost nothing. The first two budgets on an account are free and
this creates exactly two; anomaly detection is free.

Expected steady state for three static sites: a Route 53 hosted zone at fifty
cents a month, and pennies of S3 and CloudFront. Under two dollars.

## The account lock

There is a second AWS account, shared with a business partner. The failure mode
worth engineering against is not a wrong resource — it is a right resource in
the wrong account, because credentials on a laptop are ambient and whichever
profile happens to be exported is the one Terraform uses.

So `account-guard.tf` holds a precondition on the caller's account id, and
`expected_account_id` has no default. Point these credentials at any other
account and the plan stops with the two ids printed side by side. It is a
precondition rather than a `check` block on purpose: a check would print a
warning and then create everything anyway.

Set it in `terraform.tfvars`, copied from `terraform.tfvars.example`. That file
is gitignored, and this repository is public.

## Before the first apply

Terraform cannot do these; they are console-only, and the first two matter most:

1. **MFA on the root user**, then never sign in as root again.
2. **Billing preferences → receive billing alerts**, which is what makes the
   billing metric exist at all.
3. An alternate billing contact, so an alert still lands if you lose the inbox.
4. A user in IAM Identity Center for day-to-day work.
5. Cost Explorer, which takes about 24 hours to have anything to show.


## The human principal

`AdministratorAccess`, with two fences. That is not laziness, and the reasoning
is in `human-access.tf`: this stack creates IAM roles and policies, so a policy
narrow enough to be interesting is narrow enough to fail halfway through an
apply — and a policy that can create roles can escalate to admin regardless.
The deploys do not use this principal at all; they assume the OIDC role.

**Fence one: no MFA, no access.** An explicit Deny on everything except the
calls needed to enrol a device, so a fresh principal can still fix its own
lockout.

**Fence two: a cost fence.** An explicit Deny on EC2, RDS, EKS, ECS, SageMaker,
Redshift, EMR, OpenSearch, Kinesis, Lightsail and the rest of the families that
bill by the hour or by the gigabyte. Explicit Deny beats any Allow, including
AdministratorAccess, so this is a structural limit rather than an alert — the
services that produce frightening bills are simply not available. Three static
sites need S3, CloudFront, Route 53 and ACM, and none of the rest.

If a real need turns up — Lambda@Edge is the plausible one — take it out of the
list in a commit, deliberately, rather than clicking around at the time.

**Identity Center or an IAM user?** Identity Center, if you can face the setup:
its credentials expire, and an IAM user's access keys sit on the laptop until
somebody rotates them. Either works with the fences; put the permission set's
provisioned role ARN in `human_principal_arns` for Identity Center, or the user
ARN for an IAM user.

**Bootstrap order.** Create the principal in the console with
AdministratorAccess first, so there is something to run Terraform as. Terraform
cannot bootstrap itself. Then set `human_principal_arns` and apply, which
attaches the fences to it.

**The trap in the MFA fence.** `aws:MultiFactorAuthPresent` is not set at all on
a long-lived IAM access key, and `BoolIfExists` treats an absent key as a match
— so the Deny fires and a plain access key pair is refused everything, Terraform
included. That is the fence working as designed, not a bug, but it means the
obvious setup breaks the moment you apply it.

Two ways through. Either take temporary credentials that carry the MFA context:

```sh
aws sts get-session-token \
  --serial-number arn:aws:iam::<account>:mfa/<device> \
  --token-code <six digits> --duration-seconds 43200
```

and export the three values it returns before running Terraform. Or use IAM
Identity Center, whose sessions are temporary to begin with, which avoids the
problem rather than working around it.

`attach_mfa_fence = false` exists for the window between creating the user and
having MFA-derived credentials working. Turn it back on.

**And a second trap underneath the first.** A passkey or security key is the
better MFA for the console, and it cannot help the CLI at all: FIDO2 does not
produce a six-digit code, so there is nothing to pass to `--token-code`. A user
whose only MFA is a passkey has a console they can sign into and no way to get
MFA-carrying credentials for Terraform.

Register a virtual TOTP device as well — AWS allows eight per user. Passkey for
the console, authenticator app for the command line.
