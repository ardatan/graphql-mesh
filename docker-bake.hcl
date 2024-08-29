group "mesh-serve" {
  targets = ["mesh-serve"]
}

variable "MESH_SERVE_TAGS" {
  default = "dev"
}

target "mesh-serve" {
  context = "packages/serve-cli"
  platforms = ["linux/amd64", "linux/arm64"]
  tags = formatlist("ghcr.io/ardatan/mesh-serve:%s", split(",", MESH_SERVE_TAGS))
  annotations = [
    "org.opencontainers.image.title=\"Mesh Serve\"",
    "org.opencontainers.image.description=\"GraphQL Gateway by The Guild for anything-to-GraphQL\"",
    "org.opencontainers.image.licenses=MIT",
    "org.opencontainers.image.source=https://github.com/ardatan/graphql-mesh/tree/master/packages/serve-cli",
    "org.opencontainers.image.documentation=https://the-guild.dev/graphql/mesh/v1/serve/deployment/docker"
  ]
}

group "hive-gateway" {
  targets = ["hive-gateway"]
}

variable "MESH_SERVE_TAGS" {
  default = "dev"
}

target "hive-gateway" {
  context = "packages/hive-gateway"
  platforms = ["linux/amd64", "linux/arm64"]
  tags = formatlist("ghcr.io/ardatan/hive-gateway:%s", split(",", MESH_SERVE_TAGS))
  annotations = [
    "org.opencontainers.image.title=\"Hive Gateway\"",
    "org.opencontainers.image.description=\"GraphQL Gateway by The Guild\"",
    "org.opencontainers.image.licenses=MIT",
    "org.opencontainers.image.source=https://github.com/ardatan/graphql-mesh/tree/master/packages/hive-gateway",
    "org.opencontainers.image.documentation=https://the-guild.dev/graphql/mesh/v1/serve/deployment/docker"
  ]
}

//

group "e2e" {
  targets = ["mesh-serve_e2e", "mesh-serve_e2e_sqlite-chinook", "mesh-serve_e2e_openapi-javascript-wiki"]
}

target "mesh-serve_e2e" {
  context = "packages/serve-cli"
  tags = ["ghcr.io/ardatan/mesh-serve:e2e"]
}

target "mesh-serve_e2e_sqlite-chinook" {
  context = "e2e/sqlite-chinook"
  dockerfile = "serve.Dockerfile"
  tags = ["ghcr.io/ardatan/mesh-serve:e2e.sqlite-chinook"]
  contexts = {
    "mesh-serve_e2e": "target:mesh-serve_e2e"
  }
}

target "mesh-serve_e2e_openapi-javascript-wiki" {
  context = "e2e/openapi-javascript-wiki"
  dockerfile = "serve.Dockerfile"
  tags = ["ghcr.io/ardatan/mesh-serve:e2e.openapi-javascript-wiki"]
  contexts = {
    "mesh-serve_e2e": "target:mesh-serve_e2e"
  }
}
