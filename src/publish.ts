import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import type {
  JsonValue,
  PluginContext,
  FilePublishInstance,
} from "@tau/plugins";
import type { HttpRequest, HttpHandlerOptions } from "@smithy/types";
import mimeTypes from "./mime-types.json";

export const readConfig = (value: JsonValue): Record<string, JsonValue> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
export function createTransport(fetch: typeof globalThis.fetch) {
  return {
    async handle(request: HttpRequest, options: HttpHandlerOptions = {}) {
      const url = new URL(
        request.protocol +
          "//" +
          request.hostname +
          (request.port ? ":" + request.port : "") +
          request.path,
      );
      for (const [key, value] of Object.entries(request.query ?? {}))
        for (const item of Array.isArray(value) ? value : [value])
          url.searchParams.append(key, item ?? "");
      const headers = new Headers(request.headers);
      headers.delete("host");
      const response = await fetch(url, {
        method: request.method,
        headers,
        ...(request.body === undefined
          ? {}
          : {
              body:
                request.body instanceof Uint8Array
                  ? new Blob([new Uint8Array(request.body)])
                  : request.body,
            }),
        signal: options.abortSignal as AbortSignal | undefined,
      });
      return {
        response: {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers),
          body: response.body ?? undefined,
        },
      };
    },
  };
}
export function contentType(file: string) {
  const name = file.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return (
    (mimeTypes as Record<string, string>)[extension] ||
    "application/octet-stream"
  );
}
export function createPublisher(
  context: Pick<PluginContext, "fetch">,
  value: JsonValue,
): FilePublishInstance {
  const config = readConfig(value);
  const text = (key: string) =>
    typeof config[key] === "string" ? (config[key] as string) : "";
  const assertConfig = () => {
    if (
      !["accessKeyId", "secretAccessKey", "bucket", "region"].every((key) =>
        text(key),
      )
    )
      throw new Error("请填写 S3 凭据、Bucket 和 Region");
    if (text("endpoint")) {
      const url = new URL(text("endpoint"));
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error("S3 Endpoint 必须为不含凭据的 HTTP(S) 地址");
    }
  };
  let client: S3Client | undefined;
  const getClient = () => {
    assertConfig();
    return (client ??= new S3Client({
      region: text("region"),
      credentials: {
        accessKeyId: text("accessKeyId"),
        secretAccessKey: text("secretAccessKey"),
      },
      ...(text("endpoint")
        ? {
            endpoint: text("endpoint"),
            forcePathStyle: text("urlStyle") !== "virtualHosted",
          }
        : {}),
      requestHandler: createTransport(context.fetch),
    }));
  };
  const fullKey = (file: string) =>
    text("pathPrefix")
      ? text("pathPrefix").replace(/\/$/, "") + "/" + file.replace(/^\//, "")
      : file;
  return {
    mode: "files",
    concurrency: 10,
    describe: async () => {
      assertConfig();
      const raw = text("basePath") || text("pathPrefix") || "/";
      return {
        identity: JSON.stringify([
          "s3",
          text("bucket"),
          text("pathPrefix"),
          text("endpoint"),
        ]),
        basePath: raw === "/" ? "/" : "/" + raw.replace(/^\/+|\/+$/g, "") + "/",
      };
    },
    checkConnection: async (signal) => {
      await getClient().send(
        new HeadBucketCommand({ Bucket: text("bucket") }),
        {
          abortSignal: signal,
        },
      );
      return true;
    },
    uploadFile: async (file, content, signal) => {
      await getClient().send(
        new PutObjectCommand({
          Bucket: text("bucket"),
          Key: fullKey(file),
          Body: content,
          ContentType: contentType(file),
          CacheControl:
            /^(?:data\/.*[./][a-f0-9]{64}\.(?:json|css)|_tau\/client\/[a-f0-9]{64}\/|plugin-assets\/[^/]+\/[^/]+\/[a-f0-9]{64}\/)/.test(
              file,
            )
              ? "public, max-age=31536000, immutable"
              : "no-cache, must-revalidate",
        }),
        { abortSignal: signal },
      );
    },
    deleteFile: async (file, signal) => {
      await getClient().send(
        new DeleteObjectCommand({ Bucket: text("bucket"), Key: fullKey(file) }),
        { abortSignal: signal },
      );
    },
    dispose: () => {
      client?.destroy();
    },
  };
}
