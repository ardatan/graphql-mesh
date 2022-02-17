import { join } from "path";
import { existsSync, readFileSync, mkdirSync, copyFileSync } from "fs";
import rimraf from "rimraf";
import ts from "typescript";
import { compileTS } from "../../src/commands/ts-artifacts";

describe('cli ts-artifacts', () => {

  describe("compileTS", () => {
    const baseDir = join(__dirname, "fixtures", "simple-compilation");
    const cjsDir = join(baseDir, "commonjs");
    const esmDir = join(baseDir, "esm");

    async function cleanUp() {
      return new Promise<void>((resolve, reject) => {
        rimraf(cjsDir, (cjsErr) => {
          if (cjsErr) return reject(cjsErr);
          rimraf(esmDir, (esmErr) => {
            if (esmErr) return reject(esmErr);
            resolve();
          })
        });
      });
    }

    beforeAll(async () => {
      await cleanUp();
      const tsFilePath = join(baseDir, "index.ts");
      mkdirSync(cjsDir, { recursive: true });
      copyFileSync(tsFilePath, join(cjsDir, "index.ts"));
      mkdirSync(esmDir, { recursive: true })
      copyFileSync(tsFilePath, join(esmDir, "index.ts"));
    });

    afterAll(async () => {
      await cleanUp();
    });


    it('should compile ts code to js code with CommonJS module', () => {
      const tsFilePath = join(cjsDir, "index.ts");
      const jsFilePath = join(cjsDir, "index.js");
      const dtsFilePath = join(cjsDir, "index.d.ts");
      compileTS(tsFilePath, ts.ModuleKind.CommonJS, [jsFilePath, dtsFilePath]);
      expect(existsSync(jsFilePath)).toBe(true);
      expect(existsSync(dtsFilePath)).toBe(true);
      const js = readFileSync(jsFilePath, { encoding: "utf8" });
      expect(js.includes("exports.square")).toBe(true);
    });

    it('should compile ts code to js code with ESM module', () => {
      const tsFilePath = join(esmDir, "index.ts");
      const jsFilePath = join(esmDir, "index.js");
      const dtsFilePath = join(esmDir, "index.d.ts");
      compileTS(tsFilePath, ts.ModuleKind.ESNext, [jsFilePath, dtsFilePath]);
      expect(existsSync(jsFilePath)).toBe(true);
      expect(existsSync(dtsFilePath)).toBe(true);
      const js = readFileSync(jsFilePath, { encoding: "utf8" });
      expect(js.includes("export function square")).toBe(true);
    });
  });
});
