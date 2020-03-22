import { KeyValueCache, KeyValueCacheSetOptions } from '@graphql-mesh/types';
import Redis, { RedisOptions } from 'ioredis';
import DataLoader from 'dataloader';

export class RedisCache implements KeyValueCache<string> {
    readonly client: Redis.Redis;
    readonly defaultSetOptions: KeyValueCacheSetOptions = {
        ttl: 300,
    };

    private loader: DataLoader<string, string | null>;

    constructor(options?: RedisOptions) {
        this.client = new Redis(options);

        this.loader = new DataLoader(keys => this.client.mget(...keys), {
            cache: false,
        });
    }

    async set(
        key: string,
        value: string,
        options?: KeyValueCacheSetOptions,
    ): Promise<void> {
        const { ttl } = Object.assign({}, this.defaultSetOptions, options);
        if (typeof ttl === 'number') {
            await this.client.set(key, value, 'EX', ttl);
        } else {
            // We'll leave out the EXpiration when no value is specified.  Of course,
            // it may be purged from the cache for other reasons as deemed necessary.
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | undefined> {
        const reply = await this.loader.load(key);
        if (reply !== null) {
            return reply;
        }
        return;
    }

    async delete(key: string): Promise<boolean> {
        try {
            await this.client.del(key);
            return true;
        } catch(e) {
            return false;
        }
    }
}