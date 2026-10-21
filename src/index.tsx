import { useEffect, useRef, useState, type ReactNode } from "react";
import "./styles.css";
import { definePlugin, type JsonValue, type PluginSettingsProps } from "@tau/plugins";
import { Button, Input, Select } from "@tau/ui";
import { readConfig, createPublisher } from "./publish";

declare const __PLUGIN_META__: { id: string; name: string; version: string };
type Form = Record<string, JsonValue>;
const SAVE_DELAY = 600;

/** 宿主发布页组卡片内的一行：左标签 + 右控件，度量与宿主「服务」行一致 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="tps-row">
      <span className="tps-label">{label}</span>
      <div className="tps-control">{children}</div>
    </div>
  );
}

function Settings({ publishConfig }: PluginSettingsProps) {
  const [form, setForm] = useState<Form>(() => readConfig(publishConfig?.value ?? {}));
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  // 最近一次提交给宿主的配置：宿主回写同一份值时不覆盖正在输入的表单
  const savedJson = useRef(JSON.stringify(form));
  const configRef = useRef(publishConfig);
  configRef.current = publishConfig;
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    const next = readConfig(publishConfig?.value ?? {});
    const json = JSON.stringify(next);
    if (json === savedJson.current) return;
    savedJson.current = json;
    setForm(next);
  }, [publishConfig?.value]);

  const save = async (value: Form) => {
    const json = JSON.stringify(value);
    const target = configRef.current;
    if (!target || json === savedJson.current) return;
    const previous = savedJson.current;
    savedJson.current = json;
    try {
      await target.save(value as JsonValue);
      setError("");
    } catch (failure) {
      savedJson.current = previous;
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const timer = setTimeout(() => void saveRef.current(form), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [form]);
  // 关闭抽屉时防抖未到期的修改也要落盘
  useEffect(() => () => void saveRef.current(formRef.current), []);

  const text = (key: string) => (typeof form[key] === "string" ? (form[key] as string) : "");
  const input = (key: string, label: string, extra?: { secret?: boolean; placeholder?: string }) => (
    <Input
      aria-label={label}
      className="tps-mono"
      wrapperClassName="tps-grow"
      type={extra?.secret && !reveal ? "password" : "text"}
      placeholder={extra?.placeholder}
      value={text(key)}
      onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))}
      onBlur={() => void save(formRef.current)}
    />
  );

  return (
    <div className="tau-publish-s3">
      <Row label="Access Key">{input("accessKeyId", "Access Key", { secret: true })}</Row>
      <Row label="Secret Key">
        {input("secretAccessKey", "Secret Key", { secret: true })}
        <Button size="sm" variant="ghost" onClick={() => setReveal((value) => !value)}>
          {reveal ? "隐藏" : "显示"}
        </Button>
      </Row>
      <Row label="Bucket">{input("bucket", "Bucket")}</Row>
      <Row label="Region">{input("region", "Region", { placeholder: "us-east-1" })}</Row>
      <Row label="访问路径">{input("basePath", "访问路径", { placeholder: "/" })}</Row>
      <button
        type="button"
        className="tps-disclose"
        aria-expanded={advanced}
        onClick={() => setAdvanced((value) => !value)}
      >
        <span>
          高级选项
          {!advanced && <small>Endpoint、URL 风格、对象前缀</small>}
        </span>
        <span className="tps-chevron" aria-hidden>
          ›
        </span>
      </button>
      {advanced && (
        <>
          <Row label="Endpoint">
            {input("endpoint", "Endpoint（可选）", { placeholder: "留空使用 AWS 默认" })}
          </Row>
          <Row label="URL 风格">
            <Select
              aria-label="URL 风格"
              className="tps-grow"
              value={text("urlStyle") || "path"}
              options={[
                { value: "path", label: "路径风格" },
                { value: "virtualHosted", label: "虚拟主机风格" },
              ]}
              onValueChange={(value) => setForm((old) => ({ ...old, urlStyle: value }))}
            />
          </Row>
          <Row label="对象前缀">{input("pathPrefix", "对象前缀")}</Row>
        </>
      )}
      {error && (
        <p role="alert" className="tps-error">
          {error}
        </p>
      )}
    </div>
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
