const express = require('express');
const graphqlHTTP = require('express-graphql');
const path = require('path');
const cookieParser = require('cookie-parser');

const port = process.env.PORT || 4000;

const { findAndParseConfig, getMesh } = require('@graphql-mesh/runtime');

async function main(){

    const app = express();

    console.log('Generating Mesh Instance...')
    const config = await findAndParseConfig();
    const { schema, contextBuilder } = await getMesh(config);

    app.use(cookieParser());
    
    app.get('/', function (req, res) {
      res.sendFile(path.join(__dirname, '/index.html'));
    });
    
    app.use(
      '/graphql/',
      graphqlHTTP(async (req) => {
          return {
            schema,
            context: await contextBuilder(req),
            graphiql: true,
          };
      })
    );
    
    app.listen(port);

    console.log('Listening on ' + port)
    
}

main().catch(console.error);
