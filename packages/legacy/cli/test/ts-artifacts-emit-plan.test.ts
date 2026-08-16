import {
  getMeshArtifactEmitPlan,
  getMeshArtifactsPackageJson,
} from '../src/commands/ts-artifacts.js';

describe('getMeshArtifactEmitPlan', () => {
  it('emits ESM as index.js when package.json is type module even if tsconfig is CommonJS (#5193)', () => {
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: true,
        tsConfigModule: 'commonjs',
        hasPackageJson: true,
        packageJsonType: 'module',
        fileType: 'js',
      }),
    ).toEqual({
      esmExt: 'js',
      cjs: false,
      artifactsPackageType: 'module',
    });
  });

  it('keeps CJS artifacts for a CommonJS tsconfig without type module', () => {
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: true,
        tsConfigModule: 'commonjs',
        hasPackageJson: true,
        packageJsonType: undefined,
        fileType: 'js',
      }),
    ).toEqual({
      cjs: true,
      artifactsPackageType: 'commonjs',
    });
  });

  it('emits ESM as index.js when tsconfig module is ES2022', () => {
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: true,
        tsConfigModule: 'ES2022',
        hasPackageJson: true,
        packageJsonType: 'module',
        fileType: 'js',
      }),
    ).toEqual({
      esmExt: 'js',
      cjs: false,
      artifactsPackageType: 'module',
    });
  });
});

describe('getMeshArtifactsPackageJson', () => {
  it('points import/module at index.js when ESM is emitted as .js', () => {
    expect(getMeshArtifactsPackageJson('module', 'index.js')).toMatchObject({
      type: 'module',
      main: 'index.js',
      module: 'index.js',
      exports: {
        '.': './index.js',
      },
    });
  });
});
