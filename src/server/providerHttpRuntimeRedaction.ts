const PLACEHOLDERS = {
  authorization: "[REDACTED:AUTHORIZATION]",
  credential: "[REDACTED:CREDENTIAL]",
  error: "[REDACTED:ERROR]",
  idempotency: "[REDACTED:IDEMPOTENCY]",
  lease: "[REDACTED:LEASE]",
  objectKey: "[REDACTED:OBJECT_KEY]",
  payload: "[REDACTED:PAYLOAD]",
  signedUrl: "[REDACTED:SIGNED_URL]",
  stack: "[REDACTED:STACK]",
  url: "[REDACTED:URL]",
  wallet: "[REDACTED:WALLET]",
} as const;

export type ProviderHttpRuntimeRedactionPlaceholder =
  (typeof PLACEHOLDERS)[keyof typeof PLACEHOLDERS];

export const providerHttpRuntimeRedactionPlaceholders = PLACEHOLDERS;

export const redactProviderHttpRuntimeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return PLACEHOLDERS.error;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactProviderHttpRuntimeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        redactProviderHttpRuntimeField(key, nestedValue),
      ]),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  return redactProviderHttpRuntimeString(value);
};

export const containsUnsafeProviderHttpRuntimeMaterial = (value: unknown): boolean => {
  if (value instanceof Error) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsUnsafeProviderHttpRuntimeMaterial(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, nestedValue]) =>
      isSensitiveProviderHttpRuntimeKey(key)
      || containsUnsafeProviderHttpRuntimeMaterial(nestedValue)
    );
  }

  return typeof value === "string" && isUnsafeProviderHttpRuntimeString(value);
};

export const isUnsafeProviderHttpRuntimeString = (value: string): boolean =>
  isCredentialedProviderHttpUrl(value)
  || isSignedUrl(value)
  || isStackTrace(value)
  || isRawProviderPayload(value)
  || isWalletLikeValue(value)
  || isObjectKeyValue(value)
  || isSensitiveCredentialString(value)
  || isLeaseTokenValue(value)
  || isIdempotencyTokenValue(value);

export const isCredentialedProviderHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return Boolean(url.username || url.password || hasSensitiveUrlParam(url));
  } catch {
    return false;
  }
};

const redactProviderHttpRuntimeField = (key: string, value: unknown): unknown => {
  if (isSafeReferenceValue(value) && !isAlwaysRedactedReferenceKey(key)) {
    return value;
  }

  const placeholder = placeholderForKey(key);

  if (placeholder) {
    return placeholder;
  }

  return redactProviderHttpRuntimeValue(value);
};

const redactProviderHttpRuntimeString = (value: string): string => {
  if (isStackTrace(value)) {
    return PLACEHOLDERS.stack;
  }

  if (isCredentialedProviderHttpUrl(value)) {
    return isSignedUrl(value) ? PLACEHOLDERS.signedUrl : PLACEHOLDERS.url;
  }

  if (isSignedUrl(value)) {
    return PLACEHOLDERS.signedUrl;
  }

  if (isRawProviderPayload(value)) {
    return PLACEHOLDERS.payload;
  }

  if (isWalletLikeValue(value)) {
    return PLACEHOLDERS.wallet;
  }

  if (isLeaseTokenValue(value)) {
    return PLACEHOLDERS.lease;
  }

  if (isIdempotencyTokenValue(value)) {
    return PLACEHOLDERS.idempotency;
  }

  if (isObjectKeyValue(value)) {
    return PLACEHOLDERS.objectKey;
  }

  if (isSensitiveCredentialString(value)) {
    return PLACEHOLDERS.credential;
  }

  return value;
};

const placeholderForKey = (key: string): ProviderHttpRuntimeRedactionPlaceholder | undefined => {
  if (/authorization/i.test(key)) {
    return PLACEHOLDERS.authorization;
  }

  if (/stack/i.test(key)) {
    return PLACEHOLDERS.stack;
  }

  if (/thrown|error/i.test(key)) {
    return PLACEHOLDERS.error;
  }

  if (/signed[-_]?url/i.test(key)) {
    return PLACEHOLDERS.signedUrl;
  }

  if (/object[-_]?key/i.test(key)) {
    return PLACEHOLDERS.objectKey;
  }

  if (/raw|payload|request[-_]?body|response[-_]?body|provider[-_]?(response|payload)/i.test(key)) {
    return PLACEHOLDERS.payload;
  }

  if (/wallet|private[-_]?key|mnemonic/i.test(key)) {
    return PLACEHOLDERS.wallet;
  }

  if (/lease[-_]?(key|token)?/i.test(key)) {
    return PLACEHOLDERS.lease;
  }

  if (/idempotency[-_]?(key|token)?/i.test(key)) {
    return PLACEHOLDERS.idempotency;
  }

  if (/api[-_]?key|bearer|credential|secret|token/i.test(key)) {
    return PLACEHOLDERS.credential;
  }

  if (/url/i.test(key)) {
    return PLACEHOLDERS.url;
  }

  return undefined;
};

const isSensitiveProviderHttpRuntimeKey = (key: string): boolean =>
  placeholderForKey(key) !== undefined;

const isAlwaysRedactedReferenceKey = (key: string): boolean =>
  /credential|authorization|api[-_]?key|bearer|secret|token/i.test(key);

const isSafeReferenceValue = (value: unknown): value is string =>
  typeof value === "string"
  && /^(config-ref|credential-ref|evidence-ref|header-ref|idem-ref|lease-ref|policy-ref|provider\.|retry-policy|runbook-ref|secret-ref|timeout-policy):?[a-z0-9._:-]*$/i.test(
    value,
  );

const hasSensitiveUrlParam = (url: URL): boolean => {
  for (const key of url.searchParams.keys()) {
    if (/access[-_]?token|api[-_]?key|authorization|credential|signature|token|x-amz-signature/i.test(key)) {
      return true;
    }
  }

  return false;
};

const isSignedUrl = (value: string): boolean =>
  /x-amz-signature|x-goog-signature|signature=/i.test(value);

const isStackTrace = (value: string): boolean =>
  /\n\s+at\s+|Error:\s.*\n|^\s*at\s+\S+/i.test(value);

const isRawProviderPayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return /raw[-_ ]?(request|response|payload)|provider[-_ ]?(request|response|payload)/i.test(
      value,
    );
  }

  return /address|payload|provider|raw|response|score|wallet/i.test(trimmed);
};

const isWalletLikeValue = (value: string): boolean =>
  /wallet[-_ ]?(address|private|secret)|ELF_[A-Za-z0-9_]+|0x[a-fA-F0-9]{40}|mnemonic/i.test(
    value,
  );

const isObjectKeyValue = (value: string): boolean =>
  /object[-_]?key|s3:\/\/|gs:\/\/|\/raw\/|tenant\/raw\/|\.csv(\?|$)|\.json(\?|$)/i.test(value);

const isSensitiveCredentialString = (value: string): boolean =>
  /api[-_]?key|bearer\s+|credential=|secret|token=|plain-secret|social-token/i.test(value);

const isLeaseTokenValue = (value: string): boolean =>
  /lease[-_]?(key|token)?=|lease-token|lease_key/i.test(value);

const isIdempotencyTokenValue = (value: string): boolean =>
  /idempotency[-_]?(key|token)?=|idem-token|idempotency_key/i.test(value);
