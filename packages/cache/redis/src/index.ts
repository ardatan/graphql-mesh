import { KeyValueCache, KeyValueCacheSetOptions } from '@graphql-mesh/types';
import Redis, { RedisOptions } from 'ioredis';
import DataLoader from 'dataloader';

export class RedisCache implements KeyValueCache<string> {
    readonly client: Redis.Redis;

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
        const ttl = options?.ttl || 300;
        await this.client.set(key, value, 'EX', ttl);
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