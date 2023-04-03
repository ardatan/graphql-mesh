import { createBuiltMeshHTTPHandler } from '../.mesh';

self.addEventListener('fetch', createBuiltMeshHTTPHandler());
