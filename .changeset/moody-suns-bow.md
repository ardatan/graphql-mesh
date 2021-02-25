---
'@graphql-mesh/cli': minor
---

Fix CLI usage of base-dir

**Breaking changes**
This is technically just a bug fix, but it corrects a behaviour that will break if you relied on it.
When using CLI commands with the `--dir` option, those commands were using your given `--dir` as the base directory.

Now CLI commands always use the Current Working Directory (CWD) as the base directory and so the given `--dir` is used to only get the Mesh Config file and process any local file eventually defined in the Config.