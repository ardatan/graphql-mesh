group "default" {
  targets = ["mesh-serve"]
}

variable "VERSION" {
  default = "dev"
}

target "mesh-serve" {
  context = "packages/serve-cli"
  platforms = ["linux/amd64", "linux/arm64", "linux/x86_64"]
  tags = ["ghcr.io/ardatan/mesh-serve:${VERSION}"]
  annotations = [
    "index,manifest,index-descriptor,manifest-descriptor:org.opencontainers.image.title=\"Mesh Serve\"",
    "index,manifest,index-descriptor,manifest-descriptor:org.opencontainers.image.description=\"GraphQL Gateway by The Guild for anything-to-GraphQL\"",
    "index,manifest,index-descriptor,manifest-descriptor:org.opencontainers.image.licenses=MIT",
    "index,manifest,index-descriptor,manifest-descriptor:org.opencontainers.image.source=https://github.com/ardatan/graphql-mesh/tree/master/packages/serve-cli",
    "index,manifest,index-descriptor,manifest-descriptor:org.opencontainers.image.documentation=https://the-guild.dev/graphql/mesh/v1/serve/deployment/docker"
  ]
}
