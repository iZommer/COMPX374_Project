import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { atomicWriteJson, readCache } from "../server/storage.js";
import { validPayload } from "./fixtures.js";

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

describe("atomic JSON persistence", () => {
  it("writes complete JSON and atomically replaces it", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "display-store-"));
    directories.push(directory);
    const file = path.join(directory, "cache.json");
    await atomicWriteJson(file, { value: 1 });
    await atomicWriteJson(file, { value: 2 });
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual({ value: 2 });
  });

  it("discards missing, corrupt, and invalid cache data", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "display-store-"));
    directories.push(directory);
    const file = path.join(directory, "cache.json");
    expect(await readCache(file)).toBeNull();
    await writeFile(file, "not json");
    expect(await readCache(file)).toBeNull();
    await writeFile(file, JSON.stringify({ payload: {}, lastSuccessAt: "bad" }));
    expect(await readCache(file)).toBeNull();
    await atomicWriteJson(file, { payload: validPayload, lastSuccessAt: validPayload.generatedAt });
    expect((await readCache(file))?.payload.academic.name).toBe("Test Academic");
  });
});
