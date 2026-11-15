# GraphQL Mesh for Microsoft Graph

**Note:** This project is based on
[Microsoft's GraphQL for Microsoft Graph Demo](https://github.com/microsoftgraph/graphql-demo)

## About

This is a _demo_ that enables basic, read-only querying of the
[Microsoft Graph API](https://developer.microsoft.com/en-us/graph/) using
[GraphQL query syntax](http://graphql.org/learn/queries/). GraphQL enables clients to request
exactly the resources and properties that they need instead of making REST requests for each
resource and consolidating the responses. To create a GraphQL service, this demo translates the
[Microsoft Graph OData $metadata document](https://graph.microsoft.com/v1.0/$metadata) to a GraphQL
schema and generates the necessary resolvers. Please note we are providing this demo code for
evaluation as-is.

![Animation of sample request](https://user-images.githubusercontent.com/20847995/81301438-b92aeb00-9081-11ea-8bd3-c9e10d73ac8f.gif)

## Installation

1. Clone the repo
2. Install dependencies (`npm install`)
3. Navigate to the [App Registration Portal](https://apps.dev.microsoft.com/), set up a
   [new web app](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-app-registration)
4. Configure App Id and redirect URIs in the AppConfiguration of build/index.html
5. Run `npm start` and go to `localhost:4000`

### Connectors e2e

**Fixture + mock** (always — Hive Gateway + Apollo Router, v0 `example-queries`):

```bash
yarn test:e2e e2e/odata-msgraph
```

**Live Graph** (same example queries through Hive + Apollo Router → `graph.microsoft.com`):

```bash
export MSGRAPH_LIVE=1
export MSGRAPH_ACCESS_TOKEN='…' # short-lived; prefer CI refresh secrets below
yarn test:e2e e2e/odata-msgraph
```

#### One-time setup so CI refreshes the token for you

You do **not** paste a new access token every run. Store a refresh token once; the
`odata-msgraph-live` workflow exchanges it for an access token on each job.

1. **Entra ID → App registrations → New registration** (public client is fine).
2. **Authentication** → “Allow public client flows” = **Yes** (for device-code helper).
3. **API permissions** (delegated) + admin consent:
   - `User.Read`, `Mail.Read`, `Group.Read.All`, `Files.Read`, `offline_access`
4. Use a dedicated test user (mailbox / OneDrive / groups available; MFA/CA exception if needed).
5. Mint a refresh token once:

```bash
export MSGRAPH_TENANT_ID='<directory-tenant-id>'
export MSGRAPH_CLIENT_ID='<app-client-id>'
# optional for confidential apps:
# export MSGRAPH_CLIENT_SECRET='…'
node e2e/odata-msgraph/scripts/get-refresh-token.mjs
```

Follow the device-code prompt, then copy the printed values.

6. **GitHub → repo Settings → Secrets and variables → Actions** — add:

| Secret                  | Required | Notes                                       |
| ----------------------- | -------- | ------------------------------------------- |
| `MSGRAPH_TENANT_ID`     | yes\*    | Directory (tenant) ID                       |
| `MSGRAPH_CLIENT_ID`     | yes\*    | Application (client) ID                     |
| `MSGRAPH_REFRESH_TOKEN` | yes\*    | From the helper script                      |
| `MSGRAPH_CLIENT_SECRET` | no       | Only if the app is confidential             |
| `MSGRAPH_ACCESS_TOKEN`  | no       | Fallback only (~1h); prefer refresh secrets |

\*Required for automatic refresh. If none are set, the live suite skips (job stays green).

Workflow: `.github/workflows/odata-msgraph-live.yml` (path-filtered + `workflow_dispatch`).

If Microsoft rotates/revokes the refresh token, re-run the helper and update
`MSGRAPH_REFRESH_TOKEN`.

Schema note: live execute keeps the e2e fixture metadata (example-query surface). The HTTP endpoint
is real Graph (`GRAPH_VERSION=v1.0` or `beta`, same as `yarn start` / `yarn start:beta`). Abstract
OData bases are emitted as plain GraphQL objects (not interfaces) so Hive and Apollo Router share
one SDL — Router Connectors expand currently drops interface defs while leaving `implements`.

## Sample requests

#### Fetch recent emails

```graphql
{
  me {
    displayName
    officeLocation
    messages {
      subject
      isRead
      from {
        emailAddress {
          address
        }
      }
    }
  }
}
```

#### Fetch groups and members

```graphql
{
  groups {
    displayName
    description
    members {
      id
    }
  }
}
```

#### Fetch files from OneDrive

```graphql
{
  me {
    drives {
      quota {
        used
        remaining
      }
      root {
        children {
          name
          size
          lastModifiedDateTime
          webUrl
        }
      }
    }
  }
}
```
