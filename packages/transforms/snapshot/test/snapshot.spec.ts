jest.mock('fs-extra');

import transformSnapshot from '../src';
import { makeExecutableSchema } from 'graphql-tools-fork';
import { graphql } from 'graphql';
import { readFileSync, existsSync } from 'fs-extra';
import { join } from 'path';
import objectHash from 'object-hash';

describe('snapshot', () => {
    const users = [
        {
            id: '0',
            name: 'Uri Goldshtein',
            age: 20,
            email: 'uri.goldshtein@gmail.com',
            address: 'Earth',
            },
        {
            id: '1',
            name: 'Dotan Simha',
            age: 19,
            email: 'dotansimha@gmail.com',
            address: 'Moon'
        }
    ];
    it('it writes correct output', async () => {
        const schema = await transformSnapshot({
            schema: makeExecutableSchema({
                typeDefs: /* GraphQL */`
                    type Query {
                        user(id: ID): User
                    }
                    type User {
                        id: ID
                        name: String
                        age: Int
                        email: String
                        address: String
                    }
                `,
                resolvers: {
                    Query: {
                        user: (_, args) => users.find(user => args.id === user.id)
                    }
                },
            }),
            config: {
                apply: ['Query.user'],
                outputDir: '__snapshots__'
            },
        });

        await graphql({
            schema,
            source: /* GraphQL */`
                {
                    user(id: "0") {
                        id
                        name
                        age
                        email
                        address
                    }
                }
            `
        });

        const filePath = join(process.cwd(), '__snapshots__', `Query_user_${objectHash({ id: '0' })}.json`);

        expect(existsSync(filePath)).toBeTruthy();
        expect(JSON.parse(readFileSync(filePath, 'utf8'))).toMatchObject(users[0]);

    });

    it('should not call again if there is snapshot created', async () => {
        let calledCounter = 0;
        const schema = await transformSnapshot({
            schema: makeExecutableSchema({
                typeDefs: /* GraphQL */`
                    type Query {
                        user(id: ID): User
                    }
                    type User {
                        id: ID
                        name: String
                        age: Int
                        email: String
                        address: String
                    }
                `,
                resolvers: {
                    Query: {
                        user: (_, args) => {
                            calledCounter++;
                            return users.find(user => args.id === user.id);
                        },
                    }
                },
            }),
            config: {
                apply: ['Query.user'],
                outputDir: '__snapshots__'
            },
        });

        const doTheRequest = () => graphql({
            schema,
            source: /* GraphQL */`
                {
                    user(id: "1") {
                        id
                        name
                        age
                        email
                        address
                    }
                }
            `
        });
        await doTheRequest();
        expect(calledCounter).toBe(1);
        await doTheRequest();
        expect(calledCounter).toBe(1);
    })
});
