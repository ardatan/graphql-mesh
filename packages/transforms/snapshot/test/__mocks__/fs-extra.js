
const fsExtra = jest.genMockFromModule('fs-extra');

const fakeFS = new Map();

fsExtra.ensureFileSync = path => true;
fsExtra.existsSync = path => fakeFS.has(path);
fsExtra.readFileSync = path => fakeFS.get(path);
fsExtra.writeFileSync = (path, data) => fakeFS.set(path, data);

module.exports = fsExtra;
