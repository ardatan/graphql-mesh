'use strict';

const fetchache = jest.genMockFromModule('fetchache');

let mocks = {};

fetchache.Headers = Map;

fetchache.Request = function(url, config) {
    return {
        url,
        ...config,
    };
}
fetchache.Response = function(body) {
    return {
        text: async () => body,
        json: async () => JSON.parse(body),
    }
}
fetchache.addMock = (url, responseFn) => {
    mocks[url] = responseFn;
}

fetchache.resetMocks = () => {
    mocks = {};
}

fetchache.fetchache = async (request) => {
    const responseFn = mocks[request.url];
    if (!responseFn) {
        throw new Error(request.url + ` Not Found!`);
    }
    return responseFn(request);
};

module.exports = fetchache;