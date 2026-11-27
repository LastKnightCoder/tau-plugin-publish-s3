import type { ProviderFormDeclaration } from "@tau/plugins";
import { messages } from "./i18n";

export const form: ProviderFormDeclaration = {
  groups: [
    {
      title: messages.ref("account.title"),
      fields: [
        { key: "accessKeyId", label: messages.ref("account.accessKey"), type: "secret" },
        { key: "secretAccessKey", label: messages.ref("account.secretKey"), type: "secret" },
      ],
    },
    {
      title: messages.ref("location.title"),
      fields: [
        { key: "bucket", label: messages.ref("location.bucket"), type: "text", summary: true },
        {
          key: "region",
          label: messages.ref("location.region"),
          type: "text",
          default: "us-east-1",
        },
        {
          key: "basePath",
          label: messages.ref("location.basePath"),
          type: "text",
          optional: true,
          placeholder: "/",
          description: messages.ref("location.basePathHint"),
        },
        {
          key: "endpoint",
          label: messages.ref("location.endpoint"),
          type: "url",
          optional: true,
          description: messages.ref("location.endpointHint"),
        },
        {
          key: "pathPrefix",
          label: messages.ref("location.pathPrefix"),
          type: "text",
          optional: true,
          description: messages.ref("location.pathPrefixHint"),
        },
        {
          key: "urlStyle",
          label: messages.ref("style.label"),
          type: "choice",
          default: "path",
          options: [
            {
              value: "path",
              label: messages.ref("style.path"),
              description: messages.ref("style.pathHint"),
            },
            {
              value: "virtualHosted",
              label: messages.ref("style.virtual"),
              description: messages.ref("style.virtualHint"),
            },
          ],
        },
      ],
    },
  ],
};
