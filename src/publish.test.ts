import { expect, it, vi } from "vitest";
import { createPublisher, createTransport, contentType } from "./publish";
import type { HttpRequest } from "@smithy/types";
const config = {
  accessKeyId: "test-access",
  secretAccessKey: "test-secret",
  bucket: "blog",
  region: "us-east-1",
  endpoint: "https://s3.invalid",
  pathPrefix: "site/",
  basePath: "/blog/",
  urlStyle: "path",
};
it("上传保留签名、前缀、MIME 和差异缓存策略，删除使用同一对象路径", async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  const fetch = vi.fn(async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response("", { status: 200 });
  }) as typeof globalThis.fetch;
  const provider = createPublisher({ fetch }, config);
  const signal = new AbortController().signal;
  await provider.uploadFile(
    "data/article." + "a".repeat(64) + ".json",
    new Uint8Array([1, 2, 3]),
    signal,
  );
  await provider.uploadFile("index.html", new Uint8Array([4]), signal);
  await provider.deleteFile("old.html", signal);
  const first = requests[0];
  expect(new URL(first.url).pathname).toContain("/blog/site/data/article.");
  expect(new Headers(first.init?.headers).get("authorization")).toMatch(
    /^AWS4-HMAC-SHA256/,
  );
  expect(new Headers(first.init?.headers).get("content-type")).toBe(
    "application/json",
  );
  expect(new Headers(first.init?.headers).get("cache-control")).toContain(
    "immutable",
  );
  expect(
    new Uint8Array(await (first.init?.body as Blob).arrayBuffer()),
  ).toEqual(new Uint8Array([1, 2, 3]));
  expect(new Headers(requests[1].init?.headers).get("cache-control")).toBe(
    "no-cache, must-revalidate",
  );
  expect(requests[2].init?.method).toBe("DELETE");
  expect(new URL(requests[2].url).pathname).toBe("/blog/site/old.html");
  expect((await provider.describe(signal)).identity).toBe(
    JSON.stringify(["s3", "blog", "site/", "https://s3.invalid"]),
  );
  provider.dispose?.();
});
it("传输不丢失签名覆盖的长度和查询参数，拒绝不完整配置", async () => {
  const fetch = vi.fn(
    async () => new Response("", { status: 200 }),
  ) as typeof globalThis.fetch;
  await createTransport(fetch).handle({
    protocol: "https:",
    hostname: "s3.invalid",
    path: "/object",
    method: "PUT",
    headers: { host: "s3.invalid", "content-length": "2" },
    query: { versionId: "a+b" },
    body: new Uint8Array([1, 2]),
  } as HttpRequest);
  expect(
    new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get("content-length"),
  ).toBe("2");
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("versionId=a%2Bb");
  await expect(
    createPublisher({ fetch }, {}).describe(new AbortController().signal),
  ).rejects.toThrow("请填写");
});

it("模板任意扩展使用完整 MIME 表，隐藏文件不误认扩展", () => {
  expect(contentType("assets/font.woff2")).toBe("font/woff2");
  expect(contentType("manifest.webmanifest")).toBe("application/manifest+json");
  expect(contentType(".css")).toBe("application/octet-stream");
  expect(contentType("folder.json/no-extension")).toBe(
    "application/octet-stream",
  );
});
