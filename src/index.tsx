import { useEffect, useState } from "react";
import "./styles.css";
import { definePlugin, type PluginSettingsProps } from "@tau/plugins";
import { Button, Input, Select } from "@tau/ui";
import { readConfig, createPublisher } from "./publish";

declare const __PLUGIN_META__: { id: string; name: string; version: string };
function Settings({ publishConfig }: PluginSettingsProps) {
  const [form, setForm] = useState(() => readConfig(publishConfig?.value ?? {}));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setForm(readConfig(publishConfig?.value ?? {}));
  }, [publishConfig?.value]);
  const text = (key: string) => (typeof form[key] === "string" ? (form[key] as string) : "");
  return (
    <fieldset disabled={busy} className="tau-publish-s3">
      {[
        ["accessKeyId", "Access Key"],
        ["secretAccessKey", "Secret Key"],
        ["endpoint", "Endpoint（可选）"],
        ["bucket", "Bucket"],
        ["region", "Region"],
        ["pathPrefix", "对象前缀"],
        ["basePath", "访问路径"],
      ].map(([key, label]) => (
        <label className="flex flex-col gap-1" key={key}>
          <span>{label}</span>
          <Input
            aria-label={label}
            type={/Key/.test(key) ? "password" : "text"}
            value={text(key)}
            onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))}
          />
        </label>
      ))}
      <Select
        aria-label="URL 风格"
        value={text("urlStyle") || "path"}
        options={[
          { value: "path", label: "路径风格" },
          { value: "virtualHosted", label: "虚拟主机风格" },
        ]}
        onValueChange={(value) => setForm((old) => ({ ...old, urlStyle: value }))}
      />
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <Button
        variant="secondary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (!publishConfig) throw new Error("请在博客发布页配置");
            await publishConfig.save(form);
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : String(failure));
          } finally {
            setBusy(false);
          }
        }}
      >
        保存发布配置
      </Button>
    </fieldset>
  );
}
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
        component: Settings,
      });
    },
  }),
});
