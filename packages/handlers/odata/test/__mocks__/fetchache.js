'use strict';

const fetchache = jest.genMockFromModule('fetchache');
const fs = require('fs');
const path = require('path');

fetchache.fetchache = async () => ({
    text: async () => fs.readFileSync(path.resolve(__dirname, '../fixtures/trippin-metadata.xml')),
})

module.exports = fetchache;