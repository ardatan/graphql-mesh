group "default" {
  targets = ["graphql-mesh"]
}

variable "PWD" {
  default = "."
}

variable "context" {
  default = "${PWD}/docker"
}

variable "COMMIT_SHA" {
  default = ""
}

variable "BRANCH_NAME" {
  default = ""
}

function "is_master_branch" {
  params = []
  result = equal(BRANCH_NAME, "master")
}

target "graphql-mesh" {
  context = "${context}"
  dockerfile = "${PWD}/docker/Dockerfile"
  platforms = ["linux/amd64", "linux/arm64"]
  tags = compact([
    "ghcr.io/ardatan/graphql-mesh:${COMMIT_SHA}",
    is_master_branch() ? "ghcr.io/ardatan/graphql-mesh:v1-preview" : null
  ])
  args = {
    GITHUB_TOKEN = ""
  }
}
