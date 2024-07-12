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
  annotations = [
    "org.opencontainers.image.title=Mesh Serve",
    "org.opencontainers.image.description=GraphQL Gateway Framework and anything-to-GraphQL",
    "org.opencontainers.image.licenses=MIT",
    "org.opencontainers.image.source=https://github.com/ardatan/graphql-mesh/tree/master/packages/serve-cli",
    "org.opencontainers.image.documentation=https://the-guild.dev/graphql/mesh/v1/serve/deployment/docker"
  ]
}
