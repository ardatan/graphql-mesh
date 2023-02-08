import { PluginOrDisabledPlugin } from '@envelop/core';
import { useDepthLimit } from '@envelop/depth-limit';

const plugins: PluginOrDisabledPlugin = [
  useDepthLimit({
    maxDepth: 1,
  }),
];

export default plugins;
