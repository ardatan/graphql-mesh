import { KeyValueCache } from "@graphql-mesh/types";
import CachePolicy from 'http-cache-semantics';
import fetch from "cross-fetch";

export async function fetchWithCache(request: Request, cache: KeyValueCache) {
    const cacheKey = request.url;
    const entry = await cache.get(cacheKey);
    if (!entry) {
        const response = await fetch(request);

        const policy = new CachePolicy(
            policyRequestFrom(request),
            policyResponseFrom(response),
        );

        return storeResponseAndReturnClone(
            cache,
            response,
            request,
            policy,
            cacheKey,
        );
    }

    const { policy: policyRaw, body } = JSON.parse(entry);

    const policy = CachePolicy.fromObject(policyRaw);
    // Remove url from the policy, because otherwise it would never match a request with a custom cache key
    (policy as any)._url = undefined;

    if (policy.satisfiesWithoutRevalidation(policyRequestFrom(request))) {
        const headers = policy.responseHeaders() as HeadersInit;
        return new Response(body, {
            url: (policy as any)._url,
            status: (policy as any)._status,
            headers,
        } as ResponseInit);
    } else {
        const revalidationHeaders = policy.revalidationHeaders(
            policyRequestFrom(request),
        );
        const revalidationRequest = new Request(request, {
            headers: revalidationHeaders as HeadersInit,
        });
        const revalidationResponse = await fetch(revalidationRequest);

        const { policy: revalidatedPolicy, modified } = policy.revalidatedPolicy(
            policyRequestFrom(revalidationRequest),
            policyResponseFrom(revalidationResponse),
        );

        return storeResponseAndReturnClone(
            cache,
            new Response(modified ? await revalidationResponse.text() : body, {
                url: (revalidatedPolicy as any)._url,
                status: (revalidatedPolicy as any)._status,
                headers: (revalidatedPolicy as any).responseHeaders(),
            } as ResponseInit),
            request,
            revalidatedPolicy,
            cacheKey,
        );
    }
}

async function storeResponseAndReturnClone(
    cache: KeyValueCache,
    response: Response,
    request: Request,
    policy: CachePolicy,
    cacheKey: string,
): Promise<Response> {

    let ttl = Math.round(policy.timeToLive() / 1000);
    if (ttl <= 0) return response;

    // If a response can be revalidated, we don't want to remove it from the cache right after it expires.
    // We may be able to use better heuristics here, but for now we'll take the max-age times 2.
    if (canBeRevalidated(response)) {
        ttl *= 2;
    }

    const body = await response.text();
    const entry = JSON.stringify({
        policy: policy.toObject(),
        body,
    });

    await cache.set(cacheKey, entry, {
        ttl,
    });

    // We have to clone the response before returning it because the
    // body can only be used once.
    // To avoid https://github.com/bitinn/node-fetch/issues/151, we don't use
    // response.clone() but create a new response from the consumed body
    return new Response(body, {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    } as ResponseInit);
}

function canBeRevalidated(response: Response): boolean {
    return response.headers.has('ETag');
}

function policyRequestFrom(request: Request) {
    return {
        url: request.url,
        method: request.method,
        headers: headersToObject(request.headers),
    };
}

function policyResponseFrom(response: Response) {
    return {
        status: response.status,
        headers: headersToObject(response.headers),
    };
}

function headersToObject(headers: Headers) {
    const object = Object.create(null);
    headers.forEach((val, key) => {
        object[key] = val;
    });
    return object;
}