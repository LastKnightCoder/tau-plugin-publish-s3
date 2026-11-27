import { definePlugin } from "@tau/plugins";
import { messages } from "./i18n";
import { form } from "./form";
import { createPublisher } from "./publish";
declare const __PLUGIN_META__: { id: string; name: string; version: string };

export default definePlugin({
  ...__PLUGIN_META__,
  i18n: messages,
  create: () => ({
    activate(context) {
      if (!context.publish) throw new Error("请更新 Tau 以使用博客发布插件");
      context.publish.register({
        id: context.pluginId,
        name: "S3 静态托管",
        create: config => createPublisher(context, config),
      });
      context.settings.register({
        id: "publish",
        title: "S3 发布配置",
        target: "publish",
        form,
      });
    },
  }),
});
