import { definePlugin } from "@tau/plugins";
import { createPublisher } from "./publish";
declare const __PLUGIN_META__: { id: string; name: string; version: string };

export default definePlugin({
  ...__PLUGIN_META__,
  create: () => ({
    activate(context) {
      if (!context.publish) throw new Error("请更新 Tau 以使用博客发布插件");
      context.publish.register({
        id: context.pluginId,
        name: "S3 静态托管",
        create: (config) => createPublisher(context, config),
      });
      context.settings.register({
        id: "publish",
        title: "S3 发布配置",
        target: "publish",
        form: {
          groups: [
            { title: "账号", fields: [
              { key: "accessKeyId", label: "Access Key", type: "secret" },
              { key: "secretAccessKey", label: "Secret Key", type: "secret" },
            ] },
            { title: "发布位置", fields: [
              { key: "bucket", label: "Bucket", type: "text", summary: true },
              { key: "region", label: "Region", type: "text", default: "us-east-1" },
              { key: "basePath", label: "访问路径", type: "text", optional: true, placeholder: "/" },
              { key: "endpoint", label: "Endpoint", type: "url", optional: true },
              { key: "pathPrefix", label: "对象前缀", type: "text", optional: true },
              { key: "urlStyle", label: "URL 风格", type: "choice", default: "path", options: [{ value: "path", label: "路径风格" }, { value: "virtualHosted", label: "虚拟主机风格" }] },
            ] },
          ],
        },
      });
    },
  }),
});
