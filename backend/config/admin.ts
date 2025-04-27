interface AuthConfig {
  secret: string;
}

interface ApiTokenConfig {
  salt: string;
}

interface TransferTokenConfig {
  salt: string;
}

interface TransferConfig {
  token: TransferTokenConfig;
}

interface FlagsConfig {
  nps: boolean;
  promoteEE: boolean;
}

interface AdminConfig {
  auth: AuthConfig;
  apiToken: ApiTokenConfig;
  transfer: TransferConfig;
  flags: FlagsConfig;
  preview: any;
}

const getPreviewPathname = (uid, { locale, document }): string => {
  console.log('getPreviewPathname', uid, locale, document);
  const { slug } = document;
  switch (uid) {
    case "api::post.post":
      return `/blog/${slug}`;
  }
}

export default ({ env }: { env: (key: string, defaultValue?: any) => any }) => {
  const clientUrl = env("CLIENT_URL"); // Frontend application URL
  const previewSecret = env("PREVIEW_SECRET"); // Secret key for preview authentication

  return {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
    apiToken: {
      salt: env('API_TOKEN_SALT'),
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT'),
      },
    },
    flags: {
      nps: env('FLAG_NPS', 'true') === 'true',
      promoteEE: env('FLAG_PROMOTE_EE', 'true') === 'true',
    },
    preview: {
      enabled: true,
      config: {
        allowedOrigins: env('CLIENT_URL'),
        async handler(uid, { documentId, locale, status }) {
          const document = await strapi.documents(uid).findOne({ documentId });
          const pathname = getPreviewPathname(uid, { locale, document });
          if (!pathname) {
            return null;
          }
          const urlSearchParams = new URLSearchParams({
            status: "draft",
          });
          const previewUrl = new URL(`${clientUrl}${pathname}`);
          previewUrl.search = urlSearchParams.toString();
          console.log('previewUrl', previewUrl);
          return previewUrl;
        },
      },
    },
  } as AdminConfig;
}
