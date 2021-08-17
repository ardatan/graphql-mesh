import { join } from "path";
import { existsSync, readFileSync, mkdirSync, copyFileSync, rmSync } from "fs";
import ts from "typescript";
import { compileTS } from "../../src/commands/ts-artifacts";

describe('cli ts-artifacts', () => {

  describe("compileTS", () => {
    const baseDir = join(__dirname, "fixtures", "simple-compilation");
    const cjsDir = join(baseDir, "commonjs");
    const esmDir = join(baseDir, "esm");

    function cleanUp() {
      rmSync(cjsDir, { recursive: true, force: true });
      rmSync(esmDir, { recursive: true, force: true });
    }

    beforeAll(() => {
      cleanUp();
      const tsFilePath = join(baseDir, "index.ts");
      mkdirSync(cjsDir, { recursive: true });
      copyFileSync(tsFilePath, join(cjsDir, "index.ts"));
      mkdirSync(esmDir, { recursive: true })
      copyFileSync(tsFilePath, join(esmDir, "index.ts"));
    });

    afterAll(() => {
      cleanUp();
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
