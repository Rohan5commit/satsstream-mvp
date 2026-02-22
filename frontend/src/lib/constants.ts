export type NetworkName = "testnet" | "mainnet";

export const DEFAULT_NETWORK: NetworkName =
  (import.meta.env.VITE_STACKS_NETWORK as NetworkName | undefined) ?? "testnet";

export const DEFAULT_STACKS_API_URL =
  import.meta.env.VITE_STACKS_API_URL ?? "https://api.testnet.hiro.so";

export const DEFAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ?? "STYOURTESTNETADDRESS";

export const DEFAULT_CONTRACT_NAME =
  import.meta.env.VITE_CONTRACT_NAME ?? "core-router";

export const MODULE_OPTIONS = [
  {
    id: 0,
    key: "simple" as const,
    label: "SimpleYield",
    bucketLabel: "Safe Savings",
    description: "Internal simulated yield with lower volatility.",
    apy: 8,
  },
  {
    id: 1,
    key: "stable" as const,
    label: "Stable",
    bucketLabel: "Instant Spending",
    description: "Liquidity-first bucket with no simulated growth.",
    apy: 2,
  },
  {
    id: 2,
    key: "growth" as const,
    label: "Growth",
    bucketLabel: "Growth",
    description: "Higher simulated yield and higher strategy risk.",
    apy: 15,
  },
] as const;

export const ACTION_LABELS: Record<number, string> = {
  0: "Configured",
  1: "Deposit",
  2: "Withdraw",
  3: "Payer Allowed",
  4: "Payer Revoked",
};

export const MODULE_NAME_BY_ID: Record<number, string> = {
  0: "SimpleYield",
  1: "Stable",
  2: "Growth",
};
