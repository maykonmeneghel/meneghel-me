variable "domain" { type = string }
variable "zone_id" { type = string }
variable "certificate_arn" { type = string }
variable "price_class" {
  type    = string
  default = "PriceClass_100" # North America + Europe; widen if traffic says so.
}
