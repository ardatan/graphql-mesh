module.exports = [
  {
    "openapi": "3.0.0",
    "info": {
      "contact": {
        "name": "the Wikimedia Services team",
        "url": "http://mediawiki.org/wiki/REST_API"
      },
      "description": "This API provides cacheable and straightforward access to Wikimedia content and data, in machine-readable formats.\n### Global Rules\n- Limit your clients to no more than 200 requests/s to this API.\n  Each API endpoint's documentation may detail more specific usage limits.\n- Set a unique `User-Agent` or `Api-User-Agent` header that\n  allows us to contact you quickly. Email addresses or URLs\n  of contact pages work well.\n\nBy using this API, you agree to Wikimedia's  [Terms of Use](https://wikimediafoundation.org/wiki/Terms_of_Use) and [Privacy Policy](https://wikimediafoundation.org/wiki/Privacy_policy). Unless otherwise specified in the endpoint documentation below, content accessed via this API is licensed under the [CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)  and [GFDL](https://www.gnu.org/copyleft/fdl.html) licenses, and you irrevocably agree to release modifications or additions made through this API under these licenses.  See https://www.mediawiki.org/wiki/REST_API for background and details.\n### Endpoint documentation\nPlease consult each endpoint's documentation for details on:\n- Licensing information for the specific type of content\n  and data served via the endpoint.\n- Stability markers to inform you about development status and\n  change policy, according to\n  [our API version policy](https://www.mediawiki.org/wiki/API_versioning).\n- Endpoint specific usage limits.\n",
      "license": {
        "name": "Software available under the Apache 2 license",
        "url": "http://www.apache.org/licenses/LICENSE-2.0"
      },
      "termsOfService": "https://wikimediafoundation.org/wiki/Terms_of_Use",
      "title": "Wikimedia",
      "version": "1.0.0",
      "x-apisguru-categories": [
        "media"
      ],
      "x-logo": {
        "url": "https://api.apis.guru/v2/cache/logo/https_twitter.com_Wikipedia_profile_image.jpeg"
      },
      "x-origin": [
        {
          "format": "swagger",
          "url": "https://wikimedia.org/api/rest_v1/?spec",
          "version": "2.0"
        }
      ],
      "x-providerName": "wikimedia.org"
    },
    "tags": [
      {
        "description": "formula rendering",
        "name": "Math"
      }
    ],
    "paths": {
      "/feed/availability": {
        "get": {
          "description": "Gets availability of featured feed content for the apps by wiki domain.\n\nStability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n",
          "responses": {
            "200": {
              "description": "JSON containing lists of wiki domains for which feed content is available.",
              "content": {
                "application/json; charset=utf-8; profile=\"https://www.mediawiki.org/wiki/Specs/Availability/1.0.1\"": {
                  "schema": {
                    "$ref": "#/components/schemas/availability"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/availability"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json; charset=utf-8; profile=\"https://www.mediawiki.org/wiki/Specs/Availability/1.0.1\"": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Gets availability of featured feed content for the apps by wiki domain.",
          "tags": [
            "Feed content availability"
          ],
          "x-monitor": false
        }
      },
      "/media/math/check/{type}": {
        "post": {
          "description": "Checks the supplied TeX formula for correctness and returns the\nnormalised formula representation as well as information about\nidentifiers. Available types are tex and inline-tex. The response\ncontains the `x-resource-location` header which can be used to retrieve\nthe render of the checked formula in one of the supported rendering\nformats. Just append the value of the header to `/media/math/{format}/`\nand perform a GET request against that URL.\n\nStability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable).\n",
          "parameters": [
            {
              "description": "The input type of the given formula; can be tex or inline-tex",
              "in": "path",
              "name": "type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "tex",
                  "inline-tex",
                  "chem"
                ]
              }
            }
          ],
          "requestBody": {
            "content": {
              "application/x-www-form-urlencoded": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "q": {
                      "description": "The formula to check",
                      "type": "string"
                    }
                  },
                  "required": [
                    "q"
                  ]
                }
              }
            },
            "required": true
          },
          "responses": {
            "200": {
              "description": "Information about the checked formula"
            },
            "400": {
              "description": "Invalid type",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Check and normalize a TeX formula.",
          "tags": [
            "Math"
          ],
          "x-amples": [
            {
              "request": {
                "body": {
                  "q": "E=mc^{2}"
                },
                "params": {
                  "domain": "wikimedia.org",
                  "type": "tex"
                }
              },
              "response": {
                "body": {
                  "checked": "/.+/",
                  "success": true
                },
                "headers": {
                  "cache-control": "no-cache",
                  "content-type": "/^application\\/json/",
                  "x-resource-location": "/.+/"
                },
                "status": 200
              },
              "title": "Mathoid - check test formula"
            }
          ],
          "x-monitor": true
        }
      },
      "/media/math/formula/{hash}": {
        "get": {
          "description": "Returns the previously-stored formula via `/media/math/check/{type}` for\nthe given hash.\n\nStability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable).\n",
          "parameters": [
            {
              "description": "The hash string of the previous POST data",
              "in": "path",
              "name": "hash",
              "required": true,
              "schema": {
                "type": "string",
                "minLength": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Information about the checked formula"
            },
            "404": {
              "description": "Data for the given hash cannot be found",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get a previously-stored formula",
          "tags": [
            "Math"
          ],
          "x-monitor": false
        }
      },
      "/media/math/render/{format}/{hash}": {
        "get": {
          "description": "Given a request hash, renders a TeX formula into its mathematic\nrepresentation in the given format. When a request is issued to the\n`/media/math/check/{format}` POST endpoint, the response contains the\n`x-resource-location` header denoting the hash ID of the POST data. Once\nobtained, this endpoint has to be used to obtain the actual render.\n\nStability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable).\n",
          "parameters": [
            {
              "description": "The output format; can be svg or mml",
              "in": "path",
              "name": "format",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "svg",
                  "mml",
                  "png"
                ]
              }
            },
            {
              "description": "The hash string of the previous POST data",
              "in": "path",
              "name": "hash",
              "required": true,
              "schema": {
                "type": "string",
                "minLength": 1
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The rendered formula"
            },
            "404": {
              "description": "Unknown format or hash ID",
              "content": {
                "image/svg+xml": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/mathml+xml": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "image/png": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "image/svg+xml": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/mathml+xml": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "image/png": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get rendered formula in the given format.",
          "tags": [
            "Math"
          ],
          "x-monitor": false
        }
      },
      "/metrics/bytes-difference/absolute/aggregate/{project}/{editor-type}/{page-type}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project and a date range, returns a timeseries of absolute bytes\ndifference sums. You can filter by editors-type (all-editor-types, anonymous, group-bot,\nname-bot, user) and page-type (all-page-types, content, non-content). You can choose\nbetween daily and monthly granularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org. If you're interested in the aggregation of all projects, use\nall-projects.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "Time unit for the response data. As of today, supported values are daily and monthly\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/absolute-bytes-difference"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/absolute-bytes-difference"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get the sum of absolute value of text bytes difference between current edit and\nprevious one.\n",
          "tags": [
            "Bytes difference data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/bytes-difference/absolute/per-page/{project}/{page-title}/{editor-type}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project, a page-title prefixed with canonical namespace (for\ninstance 'User:Jimbo_Wales') and a date range, returns a timeseries of bytes\ndifference absolute sums. You can filter by editors-type (all-editor-types, anonymous,\ngroup-bot, name-bot, user). You can choose between daily and monthly granularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The page-title to request absolute bytes-difference for. Should be prefixed with the\npage canonical namespace.\n",
              "in": "path",
              "name": "page-title",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "Time unit for the response data. As of today, supported values are daily and monthly\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/absolute-bytes-difference-per-page"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/absolute-bytes-difference-per-page"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get the sum of absolute text bytes difference per page.",
          "tags": [
            "Bytes difference data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/bytes-difference/net/aggregate/{project}/{editor-type}/{page-type}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project and a date range, returns a timeseries of bytes difference net\nsums. You can filter by editors-type (all-editor-types, anonymous, group-bot, name-bot,\nuser) and page-type (all-page-types, content or non-content). You can choose between\ndaily and monthly granularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org. If you're interested in the aggregation of all projects, use\nall-projects.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "Time unit for the response data. As of today, supported values are daily and monthly\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/net-bytes-difference"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/net-bytes-difference"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get the sum of net text bytes difference between current edit and previous one.",
          "tags": [
            "Bytes difference data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/bytes-difference/net/per-page/{project}/{page-title}/{editor-type}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project, a page-title prefixed with canonical namespace (for\ninstance 'User:Jimbo_Wales') and a date range, returns a timeseries of bytes\ndifference net sums. You can filter by editors-type (all-editor-types, anonymous,\ngroup-bot, name-bot, user). You can choose between daily and monthly granularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The page-title to request net bytes-difference for. Should be prefixed with the\npage canonical namespace.\n",
              "in": "path",
              "name": "page-title",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "Time unit for the response data. As of today, supported values are daily and monthly\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/net-bytes-difference-per-page"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/net-bytes-difference-per-page"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get the sum of net text bytes difference per page.",
          "tags": [
            "Bytes difference data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/edited-pages/aggregate/{project}/{editor-type}/{page-type}/{activity-level}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project and a date range, returns a timeseries of its edited-pages counts.\nYou can filter by editor-type (all-editor-types, anonymous, group-bot, name-bot, user),\npage-type (all-page-types, content or non-content) or activity-level (1..4-edits,\n5..24-edits, 25..99-edits, 100..-edits). You can choose between daily and monthly\ngranularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff.  For projects like commons without language codes, use commons.wikimedia.\nFor projects like www.mediawiki.org, you can use that full string, or just use\nmediawiki or mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edited-pages in content\nnamespaces) or non-content (edited-pages in non-content namespaces). If you are\ninterested in edited-pages regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "If you want to filter by activity-level, use one of 1..4-edits, 5..24-edits,\n25..99-edits or 100..-edits. If you are interested in edited-pages regardless\nof their activity level, use all-activity-levels.\n",
              "in": "path",
              "name": "activity-level",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-activity-levels",
                  "1..4-edits",
                  "5..24-edits",
                  "25..99-edits",
                  "100..-edits"
                ]
              }
            },
            {
              "description": "The time unit for the response data. As of today, supported values are\ndaily and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/edited-pages"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/edited-pages"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get edited-pages counts for a project.",
          "tags": [
            "Edited pages data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/edited-pages/new/{project}/{editor-type}/{page-type}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project and a date range, returns a timeseries of its new pages counts.\nYou can filter by editor type (all-editor-types, anonymous, group-bot, name-bot, user)\nor page-type (all-page-types, content or non-content). You can choose between daily and\nmonthly granularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff.  For projects like commons without language codes, use commons.wikimedia.\nFor projects like www.mediawiki.org, you can use that full string, or just use\nmediawiki or mediawiki.org. If you're interested in the aggregation of all\nprojects, use all-projects.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging\nto the bot group but having bot-like names) or user (registered account not in bot\ngroup nor having bot-like name). If you are interested in edits regardless of\ntheir editor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (new pages in content\nnamespaces) or non-content (new pages in non-content namespaces). If you are\ninterested in new-articles regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "The time unit for the response data. As of today, supported values are\ndaily and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/new-pages"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/new-pages"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get new pages counts for a project.",
          "tags": [
            "Edited pages data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/edited-pages/top-by-absolute-bytes-difference/{project}/{editor-type}/{page-type}/{year}/{month}/{day}": {
        "get": {
          "description": "Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100\nedited-pages by absolute bytes-difference. You can filter by editor-type (all-editor-types,\nanonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "The year of the date for which to retrieve top edited-pages, in YYYY format.",
              "in": "path",
              "name": "year",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The month of the date for which to retrieve top edited-pages, in MM format. If you want to get the top edited-pages of a whole month, the day parameter should be all-days.",
              "in": "path",
              "name": "month",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The day of the date for which to retrieve top edited-pages, in DD format, or all-days for a monthly value.",
              "in": "path",
              "name": "day",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-edited-pages-by-abs-bytes-diff"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-edited-pages-by-abs-bytes-diff"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get top 100 edited-pages by absolute bytes-difference.",
          "tags": [
            "Edited pages data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/edited-pages/top-by-edits/{project}/{editor-type}/{page-type}/{year}/{month}/{day}": {
        "get": {
          "description": "Given a Mediawiki project and a date (day or month), returns a timeseries of the top\n100 edited-pages by edits count. You can filter by editor-type (all-editor-types,\nanonymous, group-bot, name-bot, user) or page-type (all-page-types, content or\nnon-content).\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "The year of the date for which to retrieve top edited-pages, in YYYY format.",
              "in": "path",
              "name": "year",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The month of the date for which to retrieve top edited-pages, in MM format. If you want to get the top edited-pages of a whole month, the day parameter should be all-days.",
              "in": "path",
              "name": "month",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The day of the date for which to retrieve top edited-pages, in DD format, or all-days for a monthly value.",
              "in": "path",
              "name": "day",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-edited-pages-by-edits"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-edited-pages-by-edits"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get top 100 edited-pages by edits count.",
          "tags": [
            "Edited pages data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/edited-pages/top-by-net-bytes-difference/{project}/{editor-type}/{page-type}/{year}/{month}/{day}": {
        "get": {
          "description": "Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100\nedited-pages by net bytes-difference. You can filter by editor-type (all-editor-types,\nanonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "The year of the date for which to retrieve top edited-pages, in YYYY format.",
              "in": "path",
              "name": "year",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The month of the date for which to retrieve top edited-pages, in MM format. If you want to get the top edited-pages of a whole month, the day parameter should be all-days.",
              "in": "path",
              "name": "month",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The day of the date for which to retrieve top edited-pages, in DD format, or all-days for a monthly value.",
              "in": "path",
              "name": "day",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-edited-pages-by-net-bytes-diff"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-edited-pages-by-net-bytes-diff"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get top 100 edited-pages by net bytes-difference.",
          "tags": [
            "Edited pages data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/editors/aggregate/{project}/{editor-type}/{page-type}/{activity-level}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project and a date range, returns a timeseries of its editors counts.\nYou can filter by editory-type (all-editor-types, anonymous, group-bot, name-bot, user),\npage-type (all-page-types, content or non-content) or activity-level (1..4-edits,\n5..24-edits, 25..99-edits or 100..-edits). You can choose between daily and monthly\ngranularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff.  For projects like commons without language codes, use commons.wikimedia.\nFor projects like www.mediawiki.org, you can use that full string, or just use\nmediawiki or mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging\nto the bot group but having bot-like names) or user (registered account not in bot\ngroup nor having bot-like name). If you are interested in edits regardless\nof their editor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits made in content\nnamespaces) or non-content (edits made in non-content namespaces). If you are\ninterested in editors regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "If you want to filter by activity-level, use one of 1..4-edits, 5..24-edits,\n25..99-edits or 100..-edits. If you are interested in editors regardless\nof their activity-level, use all-activity-levels.\n",
              "in": "path",
              "name": "activity-level",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-activity-levels",
                  "1..4-edits",
                  "5..24-edits",
                  "25..99-edits",
                  "100..-edits"
                ]
              }
            },
            {
              "description": "The time unit for the response data. As of today, supported values are\ndaily and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/editors"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/editors"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get editors counts for a project.",
          "tags": [
            "Editors data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/editors/top-by-absolute-bytes-difference/{project}/{editor-type}/{page-type}/{year}/{month}/{day}": {
        "get": {
          "description": "Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100\neditors by absolute bytes-difference. You can filter by editor-type (all-editor-types,\nanonymous, group-bot, name-bot, user) or page-type (all-page-types, content or non-content).\nThe user_text returned is either the mediawiki user_text if the user is registered, or\nnull if user is anonymous.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "The year of the date for which to retrieve top editors, in YYYY format.",
              "in": "path",
              "name": "year",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The month of the date for which to retrieve top editors, in MM format. If you want to get the top editors of a whole month, the day parameter should be all-days.",
              "in": "path",
              "name": "month",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The day of the date for which to retrieve top editors, in DD format, or all-days for a monthly value.",
              "in": "path",
              "name": "day",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-editors-by-abs-bytes-diff"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-editors-by-abs-bytes-diff"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get top 100 editors by absolute bytes-difference.",
          "tags": [
            "Editors data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/editors/top-by-edits/{project}/{editor-type}/{page-type}/{year}/{month}/{day}": {
        "get": {
          "description": "Given a Mediawiki project and a date (day or month), returns a timeseries of the top\n100 editors by edits count. You can filter by editor-type (all-editor-types,\nanonymous, group-bot, name-bot, user) or page-type (all-page-types, content or\nnon-content). The user_text returned is either the mediawiki user_text if the user is\nregistered, or null if user is anonymous.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "The year of the date for which to retrieve top editors, in YYYY format.",
              "in": "path",
              "name": "year",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The month of the date for which to retrieve top editors, in MM format. If you want to get the top editors of a whole month, the day parameter should be all-days.",
              "in": "path",
              "name": "month",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The day of the date for which to retrieve top editors, in DD format, or all-days for a monthly value.",
              "in": "path",
              "name": "day",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-editors-by-edits"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-editors-by-edits"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get top 100 editors by edits count.",
          "tags": [
            "Editors data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/editors/top-by-net-bytes-difference/{project}/{editor-type}/{page-type}/{year}/{month}/{day}": {
        "get": {
          "description": "Given a Mediawiki project and a date (day or month), returns a timeseries of the top 100\neditors by net bytes-difference. You can filter by editor-type (all-editor-types, anonymous,\ngroup-bot, name-bot, user) or page-type (all-page-types, content or non-content). The\nuser_text returned is either the mediawiki user_text if the user is registered, or\n\"Anonymous Editor\" if user is anonymous.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "The year of the date for which to retrieve top editors, in YYYY format.",
              "in": "path",
              "name": "year",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The month of the date for which to retrieve top editors, in MM format. If you want to get the top editors of a whole month, the day parameter should be all-days.",
              "in": "path",
              "name": "month",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The day of the date for which to retrieve top editors, in DD format, or all-days for a monthly value.",
              "in": "path",
              "name": "day",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-editors-by-net-bytes-diff"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/top-editors-by-net-bytes-diff"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get top 100 editors by net bytes-difference.",
          "tags": [
            "Editors data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/edits/aggregate/{project}/{editor-type}/{page-type}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project and a date range, returns a timeseries of edits counts.\nYou can filter by editors-type (all-editor-types, anonymous, bot, registered) and\npage-type (all-page-types, content or non-content). You can choose between daily and\nmonthly granularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff.  For projects like commons without language codes, use commons.wikimedia.\nFor projects like www.mediawiki.org, you can use that full string, or just use\nmediawiki or mediawiki.org. If you're interested in the aggregation of\nall projects, use all-projects.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging\nto the bot group but having bot-like names) or user (registered account not in bot\ngroup nor having bot-like name). If you are interested in edits regardless\nof their editor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "If you want to filter by page-type, use one of content (edits on pages in content\nnamespaces) or non-content (edits on pages in non-content namespaces). If you are\ninterested in edits regardless of their page-type, use all-page-types.\n",
              "in": "path",
              "name": "page-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-page-types",
                  "content",
                  "non-content"
                ]
              }
            },
            {
              "description": "The time unit for the response data. As of today, supported values are\ndaily and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/edits"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/edits"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get edits counts for a project.",
          "tags": [
            "Edits data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/edits/per-page/{project}/{page-title}/{editor-type}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project, a page-title prefixed with its canonical namespace (for\ninstance 'User:Jimbo_Wales') and a date range, returns a timeseries of edit counts.\nYou can filter by editors-type (all-editor-types, anonymous, group-bot, name-bot, user).\nYou can choose between daily and monthly granularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia. For\nprojects like www.mediawiki.org, you can use that full string, or just use mediawiki\nor mediawiki.org.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The page-title to request edits for. It should be prefixed with canonical namespace.\nSpaces will be converted to underscores.\n",
              "in": "path",
              "name": "page-title",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by editor-type, use one of anonymous, group-bot (registered\naccounts belonging to the bot group), name-bot (registered accounts not belonging to\nthe bot group but having bot-like names) or user (registered account not in bot group\nnor having bot-like name). If you are interested in edits regardless of their\neditor-type, use all-editor-types.\n",
              "in": "path",
              "name": "editor-type",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-editor-types",
                  "anonymous",
                  "group-bot",
                  "name-bot",
                  "user"
                ]
              }
            },
            {
              "description": "Time unit for the response data. As of today, supported values are daily and monthly\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/edits-per-page"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/edits-per-page"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get edit counts for a page in a project.",
          "tags": [
            "Edits data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/legacy/pagecounts/aggregate/{project}/{access-site}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a project and a date range, returns a timeseries of pagecounts.\nYou can filter by access site (mobile or desktop) and you can choose between monthly,\ndaily and hourly granularity as well.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 100 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff. For projects like commons without language codes, use commons.wikimedia.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by access site, use one of desktop-site or mobile-site. If you are interested in pagecounts regardless of access site use all-sites.",
              "in": "path",
              "name": "access-site",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-sites",
                  "desktop-site",
                  "mobile-site"
                ]
              }
            },
            {
              "description": "The time unit for the response data. As of today, the supported granularities for\nthis endpoint are hourly, daily and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "hourly",
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The timestamp of the first hour/day/month to include, in YYYYMMDDHH format.",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The timestamp of the last hour/day/month to include, in YYYYMMDDHH format.\nIn hourly and daily granularities this value is inclusive, in the monthly granularity\nthis value is exclusive.\n",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/pagecounts-project"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/pagecounts-project"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "tags": [
            "Legacy data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/pageviews/aggregate/{project}/{access}/{agent}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a date range, returns a timeseries of pageview counts. You can filter by project,\naccess method and/or agent type. You can choose between daily and hourly granularity\nas well.\n\n- Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)\n- Rate limit: 100 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "If you want to filter by project, use the domain of any Wikimedia project,\nfor example 'en.wikipedia.org', 'www.mediawiki.org' or 'commons.wikimedia.org'.\nIf you are interested in all pageviews regardless of project, use all-projects.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by access method, use one of desktop, mobile-app or mobile-web.\nIf you are interested in pageviews regardless of access method, use all-access.\n",
              "in": "path",
              "name": "access",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-access",
                  "desktop",
                  "mobile-app",
                  "mobile-web"
                ]
              }
            },
            {
              "description": "If you want to filter by agent type, use one of user or spider. If you are interested\nin pageviews regardless of agent type, use all-agents.\n",
              "in": "path",
              "name": "agent",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-agents",
                  "user",
                  "spider"
                ]
              }
            },
            {
              "description": "The time unit for the response data. As of today, the supported granularities for this\nendpoint are hourly, daily, and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "hourly",
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The timestamp of the first hour/day/month to include, in YYYYMMDDHH format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The timestamp of the last hour/day/month to include, in YYYYMMDDHH format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/pageview-project"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/pageview-project"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get pageview counts for a project.",
          "tags": [
            "Pageviews data"
          ],
          "x-amples": [
            {
              "request": {
                "params": {
                  "access": "all-access",
                  "agent": "all-agents",
                  "domain": "wikimedia.org",
                  "end": 1970010100,
                  "granularity": "hourly",
                  "project": "en.wikipedia",
                  "start": 1970010100
                }
              },
              "response": {
                "body": {
                  "items": [
                    {
                      "access": "all-access",
                      "agent": "all-agents",
                      "granularity": "hourly",
                      "project": "en.wikipedia",
                      "timestamp": 1970010100,
                      "views": 0
                    }
                  ]
                },
                "headers": {
                  "content-type": "application/json"
                },
                "status": 200
              },
              "title": "Get aggregate page views"
            }
          ],
          "x-monitor": true
        }
      },
      "/metrics/pageviews/per-article/{project}/{access}/{agent}/{article}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki article and a date range, returns a daily timeseries of its pageview\ncounts. You can also filter by access method and/or agent type.\n\n- Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)\n- Rate limit: 100 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "If you want to filter by project, use the domain of any Wikimedia project,\nfor example 'en.wikipedia.org', 'www.mediawiki.org' or 'commons.wikimedia.org'.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by access method, use one of desktop, mobile-app\nor mobile-web. If you are interested in pageviews regardless of access method,\nuse all-access.\n",
              "in": "path",
              "name": "access",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-access",
                  "desktop",
                  "mobile-app",
                  "mobile-web"
                ]
              }
            },
            {
              "description": "If you want to filter by agent type, use one of user, bot or spider. If you are\ninterested in pageviews regardless of agent type, use all-agents.\n",
              "in": "path",
              "name": "agent",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-agents",
                  "user",
                  "spider",
                  "bot"
                ]
              }
            },
            {
              "description": "'The title of any article in the specified project. Any spaces should be replaced\nwith underscores. It also should be URI-encoded, so that non-URI-safe characters like\n%, / or ? are accepted. Example: Are_You_the_One%3F'.\n",
              "in": "path",
              "name": "article",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The time unit for the response data. As of today, the only supported granularity for\nthis endpoint is daily and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD or YYYYMMDDHH format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD or YYYYMMDDHH format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/pageview-article"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/pageview-article"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get pageview counts for a page.",
          "tags": [
            "Pageviews data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/pageviews/top-by-country/{project}/{access}/{year}/{month}": {
        "get": {
          "description": "Lists the pageviews to this project, split by country of origin for a given month.\nBecause of privacy reasons, pageviews are given in a bucketed format, and countries\nwith less than 100 views do not get reported.\nStability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 100 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "If you want to filter by project, use the domain of any Wikimedia project,\nfor example 'en.wikipedia.org', 'www.mediawiki.org' or 'commons.wikimedia.org'.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by access method, use one of desktop, mobile-app or mobile-web.\nIf you are interested in pageviews regardless of access method, use all-access.\n",
              "in": "path",
              "name": "access",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-access",
                  "desktop",
                  "mobile-app",
                  "mobile-web"
                ]
              }
            },
            {
              "description": "The year of the date for which to retrieve top countries, in YYYY format.",
              "in": "path",
              "name": "year",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The month of the date for which to retrieve top countries, in MM format.\n",
              "in": "path",
              "name": "month",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of top countries by pageviews in the project",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/by-country"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/by-country"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get pageviews by country and access method.",
          "tags": [
            "Pageviews data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/pageviews/top/{project}/{access}/{year}/{month}/{day}": {
        "get": {
          "description": "Lists the 1000 most viewed articles for a given project and timespan (month or day).\nYou can filter by access method.\n\n- Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)\n- Rate limit: 100 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "If you want to filter by project, use the domain of any Wikimedia project,\nfor example 'en.wikipedia.org', 'www.mediawiki.org' or 'commons.wikimedia.org'.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by access method, use one of desktop, mobile-app or mobile-web.\nIf you are interested in pageviews regardless of access method, use all-access.\n",
              "in": "path",
              "name": "access",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-access",
                  "desktop",
                  "mobile-app",
                  "mobile-web"
                ]
              }
            },
            {
              "description": "The year of the date for which to retrieve top articles, in YYYY format.",
              "in": "path",
              "name": "year",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The month of the date for which to retrieve top articles, in MM format. If you want\nto get the top articles of a whole month, the day parameter should be all-days.\n",
              "in": "path",
              "name": "month",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The day of the date for which to retrieve top articles, in DD format.",
              "in": "path",
              "name": "day",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of top articles in the project",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/pageview-tops"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/pageview-tops"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get the most viewed articles for a project.",
          "tags": [
            "Pageviews data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/registered-users/new/{project}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a Mediawiki project and a date range, returns a timeseries of its newly registered\nusers counts. You can choose between daily and monthly granularity. The newly registered\nusers value is computed with self-created users only, not auto-login created ones.\n\n- Stability: [experimental](https://www.mediawiki.org/wiki/API_versioning#Experimental)\n- Rate limit: 25 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "The name of any Wikimedia project formatted like {language code}.{project name},\nfor example en.wikipedia. You may pass en.wikipedia.org and the .org will be stripped\noff.  For projects like commons without language codes, use commons.wikimedia.\nFor projects like www.mediawiki.org, you can use that full string, or just use\nmediawiki or mediawiki.org. If you're interested in the aggregation of\nall projects, use all.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The time unit for the response data. As of today, supported values are\ndaily and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The date of the first day to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The date of the last day to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/new-registered-users"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/new-registered-users"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get newly registered users counts for a project.",
          "tags": [
            "Registered users data"
          ],
          "x-monitor": false
        }
      },
      "/metrics/unique-devices/{project}/{access-site}/{granularity}/{start}/{end}": {
        "get": {
          "description": "Given a project and a date range, returns a timeseries of unique devices counts.\nYou need to specify a project, and can filter by accessed site (mobile or desktop).\nYou can choose between daily and hourly granularity as well.\n\n- Stability: [stable](https://www.mediawiki.org/wiki/API_versioning#Stable)\n- Rate limit: 100 req/s\n- License: Data accessible via this endpoint is available under the\n  [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).\n",
          "parameters": [
            {
              "description": "If you want to filter by project, use the domain of any Wikimedia project,\nfor example 'en.wikipedia.org', 'www.mediawiki.org' or 'commons.wikimedia.org'.\n",
              "in": "path",
              "name": "project",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "If you want to filter by accessed site, use one of desktop-site or mobile-site.\nIf you are interested in unique devices regardless of accessed site, use or all-sites.\n",
              "in": "path",
              "name": "access-site",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "all-sites",
                  "desktop-site",
                  "mobile-site"
                ]
              }
            },
            {
              "description": "The time unit for the response data. As of today, the supported granularities\nfor this endpoint are daily and monthly.\n",
              "in": "path",
              "name": "granularity",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "daily",
                  "monthly"
                ]
              }
            },
            {
              "description": "The timestamp of the first day/month to include, in YYYYMMDD format",
              "in": "path",
              "name": "start",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The timestamp of the last day/month to include, in YYYYMMDD format",
              "in": "path",
              "name": "end",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "The list of values",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/unique-devices"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/unique-devices"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Get unique devices count per project",
          "tags": [
            "Unique devices data"
          ],
          "x-monitor": false
        }
      },
      "/transform/html/from/{from_lang}/to/{to_lang}": {
        "parameters": [],
        "post": {
          "description": "Fetches the machine translation for the posted content from the source\nto the destination language.\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "parameters": [
            {
              "description": "The source language code",
              "in": "path",
              "name": "from_lang",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The target language code",
              "in": "path",
              "name": "to_lang",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "$ref": "#/components/requestBodies/postTransformHtmlFrom_fromLang_to_toLang_"
          },
          "responses": {
            "200": {
              "description": "The translated content",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_mt"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_mt"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Machine-translate content",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        }
      },
      "/transform/html/from/{from_lang}/to/{to_lang}/{provider}": {
        "parameters": [],
        "post": {
          "description": "Fetches the machine translation for the posted content from the source\nto the destination language.\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "parameters": [
            {
              "description": "The source language code",
              "in": "path",
              "name": "from_lang",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The target language code",
              "in": "path",
              "name": "to_lang",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The machine translation provider id",
              "in": "path",
              "name": "provider",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "Apertium",
                  "Yandex",
                  "Youdao"
                ]
              }
            }
          ],
          "requestBody": {
            "$ref": "#/components/requestBodies/postTransformHtmlFrom_fromLang_to_toLang_"
          },
          "responses": {
            "200": {
              "description": "The translated content",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_mt"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_mt"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Machine-translate content",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        }
      },
      "/transform/list/languagepairs/": {
        "get": {
          "description": "Fetches the list of language pairs the back-end service can translate\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "responses": {
            "200": {
              "description": "the list of source and target languages supported by the API",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_languagepairs"
                  }
                }
              }
            }
          },
          "summary": "Lists the language pairs supported by the back-end",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        }
      },
      "/transform/list/pair/{from}/{to}/": {
        "get": {
          "description": "Fetches the list of tools that are available for the given pair of languages.\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "parameters": [
            {
              "description": "The source language code",
              "in": "path",
              "name": "from",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The target language code",
              "in": "path",
              "name": "to",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "the list of tools available for the language pair",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_list_tools"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_list_tools"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Lists the tools available for a language pair",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        }
      },
      "/transform/list/tool/{tool}": {
        "get": {
          "description": "Fetches the list of tools and all of the language pairs it can translate\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "parameters": [
            {
              "description": "The tool category to list tools and language pairs for",
              "in": "path",
              "name": "tool",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "mt",
                  "dictionary"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "the list of language pairs available for a given translation tool",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_list_pairs_for_tool"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_list_pairs_for_tool"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Lists the tools and language pairs available for the given tool category",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        },
        "parameters": []
      },
      "/transform/list/tool/{tool}/{from}": {
        "get": {
          "description": "Fetches the list of tools and all of the language pairs it can translate\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "parameters": [
            {
              "description": "The tool category to list tools and language pairs for",
              "in": "path",
              "name": "tool",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "mt",
                  "dictionary"
                ]
              }
            },
            {
              "description": "The source language code",
              "in": "path",
              "name": "from",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "the list of language pairs available for a given translation tool",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_list_pairs_for_tool"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_list_pairs_for_tool"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Lists the tools and language pairs available for the given tool category",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        },
        "parameters": []
      },
      "/transform/list/tool/{tool}/{from}/{to}": {
        "get": {
          "description": "Fetches the list of tools and all of the language pairs it can translate\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "parameters": [
            {
              "description": "The tool category to list tools and language pairs for",
              "in": "path",
              "name": "tool",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "mt",
                  "dictionary"
                ]
              }
            },
            {
              "description": "The source language code",
              "in": "path",
              "name": "from",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The target language code",
              "in": "path",
              "name": "to",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "the list of language pairs available for a given translation tool",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_list_pairs_for_tool"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_list_pairs_for_tool"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Lists the tools and language pairs available for the given tool category",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        },
        "parameters": []
      },
      "/transform/word/from/{from_lang}/to/{to_lang}/{word}": {
        "get": {
          "description": "Fetches the dictionary meaning of a word from a language and displays\nit in the target language.\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "parameters": [
            {
              "description": "The source language code",
              "in": "path",
              "name": "from_lang",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The target language code",
              "in": "path",
              "name": "to_lang",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The word to lookup",
              "in": "path",
              "name": "word",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "the dictionary translation for the given word",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_dict"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_dict"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Fetch the dictionary meaning of a word",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        },
        "parameters": []
      },
      "/transform/word/from/{from_lang}/to/{to_lang}/{word}/{provider}": {
        "get": {
          "description": "Fetches the dictionary meaning of a word from a language and displays\nit in the target language.\n\nStability: [unstable](https://www.mediawiki.org/wiki/API_versioning#Unstable)\n",
          "parameters": [
            {
              "description": "The source language code",
              "in": "path",
              "name": "from_lang",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The target language code",
              "in": "path",
              "name": "to_lang",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The word to lookup",
              "in": "path",
              "name": "word",
              "required": true,
              "schema": {
                "type": "string"
              }
            },
            {
              "description": "The dictionary provider id",
              "in": "path",
              "name": "provider",
              "required": true,
              "schema": {
                "type": "string",
                "enum": [
                  "JsonDict",
                  "Dictd"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "the dictionary translation for the given word",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_dict"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/cx_dict"
                  }
                }
              }
            },
            "default": {
              "description": "Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                },
                "application/problem+json": {
                  "schema": {
                    "$ref": "#/components/schemas/problem"
                  }
                }
              }
            }
          },
          "summary": "Fetch the dictionary meaning of a word",
          "tags": [
            "Transform"
          ],
          "x-monitor": false
        },
        "parameters": []
      }
    },
    "x-default-params": {},
    "x-host-basePath": "/api/rest_v1",
    "servers": [
      {
        "url": "https://wikimedia.org/api/rest_v1"
      }
    ],
    "components": {
      "requestBodies": {
        "postTransformHtmlFrom_fromLang_to_toLang_": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "object",
                "properties": {
                  "html": {
                    "description": "The HTML content to translate",
                    "type": "string",
                    "x-textarea": true
                  }
                },
                "required": [
                  "html"
                ]
              }
            }
          },
          "required": true
        }
      },
      "securitySchemes": {
        "mediawiki_auth": {
          "description": "Checks permissions using MW api",
          "in": "header",
          "name": "cookie",
          "type": "apiKey",
          "x-internal-request-whitelist": [
            "/http:\\/\\/[a-zA-Z0-9\\.]+\\/w\\/api\\.php/"
          ]
        }
      },
      "schemas": {
        "absolute-bytes-difference": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "abs_bytes_diff": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "absolute-bytes-difference-per-editor": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "abs_bytes_diff": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  },
                  "user-text": {
                    "type": "string"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "absolute-bytes-difference-per-page": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-title": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "abs_bytes_diff": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "availability": {
          "additionalProperties": false,
          "properties": {
            "in_the_news": {
              "description": "domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project",
              "items": {
                "type": "string"
              },
              "type": "array"
            },
            "most_read": {
              "description": "domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project",
              "items": {
                "type": "string"
              },
              "type": "array"
            },
            "on_this_day": {
              "description": "domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project",
              "items": {
                "type": "string"
              },
              "type": "array"
            },
            "picture_of_the_day": {
              "description": "domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project",
              "items": {
                "type": "string"
              },
              "type": "array"
            },
            "todays_featured_article": {
              "description": "domains for wikis with this feature enabled, or [ '*.<project>.org' ] for all wikis in a project",
              "items": {
                "type": "string"
              },
              "type": "array"
            }
          },
          "required": [
            "todays_featured_article",
            "most_read",
            "picture_of_the_day",
            "in_the_news",
            "on_this_day"
          ],
          "type": "object"
        },
        "by-country": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "access": {
                    "type": "string"
                  },
                  "countries": {
                    "items": {
                      "properties": {
                        "country": {
                          "type": "string"
                        },
                        "rank": {
                          "format": "int32",
                          "type": "integer"
                        },
                        "views": {
                          "format": "int64",
                          "type": "integer"
                        }
                      }
                    },
                    "type": "array"
                  },
                  "month": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "year": {
                    "type": "string"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "cx_dict": {
          "properties": {
            "source": {
              "description": "the original word to look up",
              "type": "string"
            },
            "translations": {
              "description": "the translations found",
              "items": {
                "properties": {
                  "info": {
                    "description": "extra information about the phrase",
                    "type": "string"
                  },
                  "phrase": {
                    "description": "the translated phrase",
                    "type": "string"
                  },
                  "sources": {
                    "description": "the source dictionary used for the translation",
                    "type": "string"
                  }
                },
                "type": "object"
              },
              "type": "array"
            }
          },
          "type": "object"
        },
        "cx_languagepairs": {
          "properties": {
            "source": {
              "description": "the list of available source languages",
              "items": {
                "description": "one source language",
                "type": "string"
              },
              "type": "array"
            },
            "target": {
              "description": "the list of available destination languages",
              "items": {
                "description": "one destination language",
                "type": "string"
              },
              "type": "array"
            }
          },
          "type": "object"
        },
        "cx_list_pairs_for_tool": {
          "type": "object"
        },
        "cx_list_tools": {
          "properties": {
            "tools": {
              "description": "the list of tools available for the given language pair",
              "items": {
                "description": "the tool available",
                "type": "string"
              },
              "type": "array"
            }
          },
          "type": "object"
        },
        "cx_mt": {
          "properties": {
            "contents": {
              "description": "the translated content",
              "type": "string"
            }
          },
          "type": "object"
        },
        "edited-pages": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "activity-level": {
                    "type": "string"
                  },
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "edited_pages": {
                          "format": "int32",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "editors": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "activity-level": {
                    "type": "string"
                  },
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "editors": {
                          "format": "int32",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "edits": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "edits": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "edits-per-editor": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "edits": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  },
                  "user-text": {
                    "type": "string"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "edits-per-page": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-title": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "edits": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "listing": {
          "description": "The result format for listings",
          "properties": {
            "items": {
              "items": {
                "type": "string"
              },
              "type": "array"
            }
          },
          "required": [
            "items"
          ]
        },
        "net-bytes-difference": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "net_bytes_diff": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "net-bytes-difference-per-editor": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "net_bytes_diff": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  },
                  "user-text": {
                    "type": "string"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "net-bytes-difference-per-page": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-title": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "net_bytes_diff": {
                          "format": "int64",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "new-pages": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "new_pages": {
                          "format": "int32",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "new-registered-users": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "granularity": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "new_registered_users": {
                          "format": "int32",
                          "type": "integer"
                        },
                        "timestamp": {
                          "type": "string"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "originalimage": {
          "properties": {
            "height": {
              "description": "Original image height",
              "type": "integer"
            },
            "source": {
              "description": "Original image URI",
              "type": "string"
            },
            "width": {
              "description": "Original image width",
              "type": "integer"
            }
          },
          "required": [
            "source",
            "width",
            "height"
          ],
          "type": "object"
        },
        "pagecounts-project": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "access-site": {
                    "type": "string"
                  },
                  "count": {
                    "format": "int64",
                    "type": "integer"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "timestamp": {
                    "type": "string"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "pageview-article": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "access": {
                    "type": "string"
                  },
                  "agent": {
                    "type": "string"
                  },
                  "article": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "timestamp": {
                    "type": "string"
                  },
                  "views": {
                    "format": "int64",
                    "type": "integer"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "pageview-project": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "access": {
                    "type": "string"
                  },
                  "agent": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "timestamp": {
                    "type": "string"
                  },
                  "views": {
                    "format": "int64",
                    "type": "integer"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "pageview-tops": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "access": {
                    "type": "string"
                  },
                  "articles": {
                    "items": {
                      "properties": {
                        "article": {
                          "type": "string"
                        },
                        "rank": {
                          "format": "int32",
                          "type": "integer"
                        },
                        "views": {
                          "format": "int64",
                          "type": "integer"
                        }
                      }
                    },
                    "type": "array"
                  },
                  "day": {
                    "type": "string"
                  },
                  "month": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "year": {
                    "type": "string"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "problem": {
          "properties": {
            "detail": {
              "type": "string"
            },
            "method": {
              "type": "string"
            },
            "status": {
              "type": "integer"
            },
            "title": {
              "type": "string"
            },
            "type": {
              "type": "string"
            },
            "uri": {
              "type": "string"
            }
          },
          "required": [
            "type"
          ]
        },
        "summary": {
          "properties": {
            "coordinates": {
              "description": "The coordinates of the item",
              "properties": {
                "lat": {
                  "description": "The latitude",
                  "type": "number"
                },
                "lon": {
                  "description": "The longitude",
                  "type": "number"
                }
              },
              "required": [
                "lat",
                "lon"
              ],
              "type": "object"
            },
            "description": {
              "description": "Wikidata description for the page",
              "example": "American poet",
              "type": "string"
            },
            "dir": {
              "description": "The page language direction code",
              "example": "ltr",
              "type": "string"
            },
            "displaytitle": {
              "description": "The page title how it should be shown to the user",
              "type": "string"
            },
            "extract": {
              "description": "First several sentences of an article in plain text",
              "type": "string"
            },
            "extract_html": {
              "description": "First several sentences of an article in simple HTML format",
              "type": "string"
            },
            "lang": {
              "description": "The page language code",
              "example": "en",
              "type": "string"
            },
            "originalimage": {
              "$ref": "#/components/schemas/originalimage"
            },
            "pageid": {
              "description": "The page ID",
              "type": "integer"
            },
            "thumbnail": {
              "$ref": "#/components/schemas/thumbnail"
            },
            "timestamp": {
              "description": "The time when the page was last editted in the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format",
              "example": "2021-08-24T13:25:10.119Z",
              "type": "string"
            },
            "title": {
              "description": "The page title",
              "type": "string"
            }
          },
          "required": [
            "title",
            "extract",
            "lang",
            "dir"
          ],
          "type": "object"
        },
        "thumbnail": {
          "properties": {
            "height": {
              "description": "Thumnail height",
              "type": "integer"
            },
            "source": {
              "description": "Thumbnail image URI",
              "type": "string"
            },
            "width": {
              "description": "Thumbnail width",
              "type": "integer"
            }
          },
          "required": [
            "source",
            "width",
            "height"
          ],
          "type": "object"
        },
        "top-edited-pages-by-abs-bytes-diff": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "timestamp": {
                          "type": "string"
                        },
                        "top": {
                          "items": {
                            "properties": {
                              "abs_bytes_diff": {
                                "format": "int64",
                                "type": "integer"
                              },
                              "page_title": {
                                "type": "string"
                              },
                              "rank": {
                                "format": "int32",
                                "type": "integer"
                              }
                            }
                          },
                          "type": "array"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "top-edited-pages-by-edits": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "timestamp": {
                          "type": "string"
                        },
                        "top": {
                          "items": {
                            "properties": {
                              "edits": {
                                "format": "int64",
                                "type": "integer"
                              },
                              "page_title": {
                                "type": "string"
                              },
                              "rank": {
                                "format": "int32",
                                "type": "integer"
                              }
                            }
                          },
                          "type": "array"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "top-edited-pages-by-net-bytes-diff": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "timestamp": {
                          "type": "string"
                        },
                        "top": {
                          "items": {
                            "properties": {
                              "net_bytes_diff": {
                                "format": "int64",
                                "type": "integer"
                              },
                              "page_title": {
                                "type": "string"
                              },
                              "rank": {
                                "format": "int32",
                                "type": "integer"
                              }
                            }
                          },
                          "type": "array"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "top-editors-by-abs-bytes-diff": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "timestamp": {
                          "type": "string"
                        },
                        "top": {
                          "items": {
                            "properties": {
                              "abs_bytes_diff": {
                                "format": "int64",
                                "type": "integer"
                              },
                              "rank": {
                                "format": "int32",
                                "type": "integer"
                              },
                              "user_text": {
                                "type": "string"
                              }
                            }
                          },
                          "type": "array"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "top-editors-by-edits": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "timestamp": {
                          "type": "string"
                        },
                        "top": {
                          "items": {
                            "properties": {
                              "edits": {
                                "format": "int64",
                                "type": "integer"
                              },
                              "rank": {
                                "format": "int32",
                                "type": "integer"
                              },
                              "user_text": {
                                "type": "string"
                              }
                            }
                          },
                          "type": "array"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "top-editors-by-net-bytes-diff": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "editor-type": {
                    "type": "string"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "page-type": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "results": {
                    "items": {
                      "properties": {
                        "timestamp": {
                          "type": "string"
                        },
                        "top": {
                          "items": {
                            "properties": {
                              "net_bytes_diff": {
                                "format": "int64",
                                "type": "integer"
                              },
                              "rank": {
                                "format": "int32",
                                "type": "integer"
                              },
                              "user_text": {
                                "type": "string"
                              }
                            }
                          },
                          "type": "array"
                        }
                      }
                    },
                    "type": "array"
                  }
                }
              },
              "type": "array"
            }
          }
        },
        "unique-devices": {
          "properties": {
            "items": {
              "items": {
                "properties": {
                  "access-site": {
                    "type": "string"
                  },
                  "devices": {
                    "format": "int64",
                    "type": "integer"
                  },
                  "granularity": {
                    "type": "string"
                  },
                  "project": {
                    "type": "string"
                  },
                  "timestamp": {
                    "type": "string"
                  }
                }
              },
              "type": "array"
            }
          }
        }
      }
    }
  }
]