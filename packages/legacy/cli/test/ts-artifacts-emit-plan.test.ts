import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getMeshArtifactEmitPlan,
  getMeshArtifactsPackageJson,
  readResolvedTsConfigModule,
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

  it('keeps the historical es* tsconfig plan without package.json type module', () => {
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: true,
        tsConfigModule: 'ESNext',
        hasPackageJson: true,
        packageJsonType: undefined,
        fileType: 'js',
      }),
    ).toEqual({
      esmExt: 'js',
      cjs: false,
      artifactsPackageType: 'module',
    });
  });

  it('does not write artifacts package.json for fileType ts', () => {
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: true,
        tsConfigModule: 'commonjs',
        hasPackageJson: true,
        packageJsonType: undefined,
        fileType: 'ts',
      }),
    ).toEqual({
      cjs: true,
      artifactsPackageType: undefined,
    });
  });

  it('uses node16 + type module as ESM index.js', () => {
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: true,
        tsConfigModule: 'node16',
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

  it('uses nodenext without type module as CJS', () => {
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: true,
        tsConfigModule: 'nodenext',
        hasPackageJson: true,
        packageJsonType: undefined,
        fileType: 'js',
      }),
    ).toEqual({
      cjs: true,
      artifactsPackageType: 'commonjs',
    });
  });

  it('emits dual CJS + mjs when there is no tsconfig and package.json is not module', () => {
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: false,
        hasPackageJson: true,
        packageJsonType: undefined,
        fileType: 'js',
      }),
    ).toEqual({
      esmExt: 'mjs',
      cjs: false,
      artifactsPackageType: 'module',
    });
    expect(
      getMeshArtifactEmitPlan({
        hasTsConfig: false,
        hasPackageJson: true,
        packageJsonType: undefined,
        fileType: 'json',
      }),
    ).toEqual({
      esmExt: 'mjs',
      cjs: true,
      artifactsPackageType: 'commonjs',
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

  it('does not advertise a missing index.mjs for CJS-only artifacts', () => {
    expect(getMeshArtifactsPackageJson('commonjs')).toMatchObject({
      type: 'commonjs',
      main: 'index.js',
      exports: {
        '.': './index.js',
        './*': './*.js',
      },
    });
    expect(getMeshArtifactsPackageJson('commonjs')).not.toHaveProperty('module');
  });

  it('keeps dual-package import paths when .mjs is emitted', () => {
    expect(getMeshArtifactsPackageJson('commonjs', 'index.mjs')).toMatchObject({
      module: 'index.mjs',
      exports: {
        '.': {
          require: './index.js',
          import: './index.mjs',
        },
      },
    });
  });
});

describe('readResolvedTsConfigModule', () => {
  it('inherits compilerOptions.module from tsconfig extends', () => {
    const root = mkdtempSync(join(tmpdir(), 'mesh-tsconfig-'));
    const projectDir = join(root, 'app');
    mkdirSync(projectDir);
    writeFileSync(
      join(root, 'tsconfig.base.json'),
      JSON.stringify({ compilerOptions: { module: 'ES2022' } }),
    );
    writeFileSync(
      join(projectDir, 'tsconfig.json'),
      JSON.stringify({ extends: '../tsconfig.base.json', compilerOptions: { rootDir: './' } }),
    );
    try {
      expect(readResolvedTsConfigModule(projectDir)?.toLowerCase()).toBe('es2022');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
