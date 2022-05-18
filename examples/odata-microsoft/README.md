# GraphQL Mesh for Microsoft Graph

**Note:** This project is based on [Microsoft's GraphQL for Microsoft Graph Demo](https://github.com/microsoftgraph/graphql-demo)

## About

This is a _demo_ that enables basic, read-only querying of the [Microsoft Graph API](https://developer.microsoft.com/en-us/graph/) using [GraphQL query syntax](http://graphql.org/learn/queries/). GraphQL enables clients to request exactly the resources and properties that they need instead of making REST requests for each resource and consolidating the responses. To create a GraphQL service, this demo translates the [Microsoft Graph OData $metadata document](https://graph.microsoft.com/v1.0/$metadata) to a GraphQL schema and generates the necessary resolvers. Please note we are providing this demo code for evaluation as-is.

![Animation of sample request](https://user-images.githubusercontent.com/20847995/81301438-b92aeb00-9081-11ea-8bd3-c9e10d73ac8f.gif)

## Installation

1. Clone the repo
2. Install dependencies (`npm install`)
3. Navigate to the [App Registration Portal](https://apps.dev.microsoft.com/), set up a [new web app](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-app-registration)
4. Configure App Id and redirect URIs in the AppConfiguration of build/index.html
5. Run `npm start` and go to `localhost:4000`

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
