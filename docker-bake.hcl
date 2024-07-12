group "default" {
  targets = ["mesh-serve"]
}

variable "VERSION" {
  default = "dev"
}

target "mesh-serve" {
  context = "packages/serve-cli"
  platforms = ["linux/amd64", "linux/arm64", "linux/aarch64"]
  tags = ["ghcr.io/ardatan/mesh-serve:${VERSION}"]
}
