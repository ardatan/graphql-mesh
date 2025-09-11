const { Opts } = require('@e2e/opts');
const express = require('express');
const app = express();

const opts = Opts(process.argv);
const port = opts.getServicePort('ErrorService');

// OpenAPI specification
const openApiSpec = {
  "openapi": "3.0.0",
  "info": {
    "title": "Union Error Testing API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": `http://localhost:${port}`
    }
  ],
  "paths": {
    "/userNoErrorHandling": {
      "get": {
        "operationId": "getUserNoErrorHandling",
        "description": "Get user - direct response type without error handling",
        "responses": {
          "200": {
            "description": "User found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      }
    },
    "/userUnionNoErrorHandling": {
      "get": {
        "operationId": "getUserUnionNoErrorHandling",
        "description": "Get user - union response type without error handling",
        "responses": {
          "200": {
            "description": "User data",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          },
          "202": {
            "description": "Async job created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AsyncJob"
                }
              }
            }
          }
        }
      }
    },
    "/userErrorHandling": {
      "get": {
        "operationId": "getUserErrorHandling",
        "description": "Get user - direct response type with error handling",
        "responses": {
          "200": {
            "description": "User data",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          },
          "400": {
            "description": "Bad request error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/userUnionErrorHandling": {
      "get": {
        "operationId": "getUserUnionErrorHandling",
        "description": "Get user - union response type with error handling",
        "responses": {
          "200": {
            "description": "User data",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          },
          "202": {
            "description": "Async job created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AsyncJob"
                }
              }
            }
          },
          "400": {
            "description": "Bad request error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "email": { "type": "string" }
        },
        "required": ["id", "name", "email"]
      },
      "AsyncJob": {
        "type": "object",
        "properties": {
          "asynchronous_job_id": { "type": "string" },
          "status": { "type": "string" },
          "estimated_completion": { "type": "string" }
        },
        "required": ["asynchronous_job_id", "status"]
      },
      "Error": {
        "type": "object",
        "properties": {
          "error": { "type": "string" },
          "code": { "type": "integer" }
        },
        "required": ["error", "code"]
      }
    }
  }
};

// Serve the OpenAPI spec
app.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

// Endpoints without error handling in OpenAPI schema (but still return errors)
app.get('/userNoErrorHandling', (req, res) => {
  res.status(400).json({ error: 'Bad request', code: 400 });
});

app.get('/userUnionNoErrorHandling', (req, res) => {
  res.status(400).json({ error: 'Bad request', code: 400 });
});

// Endpoints with error handling in OpenAPI schema
app.get('/userErrorHandling', (req, res) => {
  res.status(400).json({ error: 'User not found', code: 400 });
});

app.get('/userUnionErrorHandling', (req, res) => {
  res.status(400).json({ error: 'User union error', code: 400 });
});

const server = app.listen(port, () => {
  console.log(`Error Service running at http://localhost:${port}`);
});

module.exports = server;

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
