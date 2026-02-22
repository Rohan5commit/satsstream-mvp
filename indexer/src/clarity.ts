type TypedValue = {
  type: string;
  value: unknown;
};

const isTypedValue = (value: unknown): value is TypedValue => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "type" in value && "value" in value;
};

export const normalizeClarity = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeClarity(item));
  }

  if (isTypedValue(value)) {
    switch (value.type) {
      case "uint":
      case "int":
        return BigInt(String(value.value));
      case "bool":
        return Boolean(value.value);
      case "principal":
      case "trait_reference":
      case "string-ascii":
      case "string-utf8":
      case "buffer":
        return String(value.value);
      default:
        return normalizeClarity(value.value);
    }
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = normalizeClarity(item);
  }
  return output;
};

export const asBigint = (value: unknown, fallback: bigint = BigInt(0)): bigint => {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return BigInt(value);
  }
  return fallback;
};

export const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return Number(value);
  }
  return fallback;
};

export const asString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }
  return fallback;
};
