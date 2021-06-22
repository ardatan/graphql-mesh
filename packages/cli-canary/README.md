@graphql-mesh/cli-canary
========================



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@graphql-mesh/cli-canary.svg)](https://npmjs.org/package/@graphql-mesh/cli-canary)
[![Downloads/week](https://img.shields.io/npm/dw/@graphql-mesh/cli-canary.svg)](https://npmjs.org/package/@graphql-mesh/cli-canary)
[![License](https://img.shields.io/npm/l/@graphql-mesh/cli-canary.svg)](https://github.com/urigo/graphql-mesh/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @graphql-mesh/cli-canary
$ graphql-mesh COMMAND
running command...
$ graphql-mesh (-v|--version|version)
@graphql-mesh/cli-canary/0.0.0 darwin-x64 node-v14.15.4
$ graphql-mesh --help [COMMAND]
USAGE
  $ graphql-mesh COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`graphql-mesh hello [FILE]`](#graphql-mesh-hello-file)
* [`graphql-mesh help [COMMAND]`](#graphql-mesh-help-command)

## `graphql-mesh hello [FILE]`

describe the command here

```
USAGE
  $ graphql-mesh hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ graphql-mesh hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/urigo/graphql-mesh/blob/v0.0.0/src/commands/hello.ts)_

## `graphql-mesh help [COMMAND]`

display help for graphql-mesh

```
USAGE
  $ graphql-mesh help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_
<!-- commandsstop -->
