import { request } from "@stacks/connect";
import { Cl, cvToHex, cvToValue, hexToCV } from "@stacks/transactions";
import type { ClarityValue } from "@stacks/transactions";

import { asBigint, asNumber, asString, normalizeClarity } from "./clarity";
import type {
  HistoryEvent,
  ModuleId,
  PositionRecord,
  StacksContractConfig,
  StrategyDraft,
  StrategyRecord,
  UserPositions,
} from "./types";

type WalletResponse = {
  addresses?: Array<{ address?: string }>;
  stx?: Array<{ address?: string }>;
  stxAddress?: string;
};

type TxResponse = {
  txid?: string;
  txId?: string;
  transactionId?: string;
};

const CONNECT_OPTIONS = {
  forceWalletSelect: true,
  persistWalletSelect: false,
  enableLocalStorage: false,
} as const;

const REQUEST_OPTIONS = {
  persistWalletSelect: false,
  enableLocalStorage: false,
} as const;

const extractAddress = (response: WalletResponse): string | null => {
  if (response.stxAddress && response.stxAddress.startsWith("S")) {
    return response.stxAddress;
  }

  const fromStx = response.stx?.find((entry) => entry.address?.startsWith("S"));
  if (fromStx?.address) {
    return fromStx.address;
  }

  const fromAddresses = response.addresses?.find((entry) => entry.address?.startsWith("S"));
  if (fromAddresses?.address) {
    return fromAddresses.address;
  }

  return null;
};

const getContractId = (config: StacksContractConfig): `${string}.${string}` =>
  `${config.contractAddress}.${config.contractName}` as `${string}.${string}`;

const postReadOnly = async (
  config: StacksContractConfig,
  sender: string,
  functionName: string,
  args: unknown[]
): Promise<unknown> => {
  const endpoint = `${config.apiUrl}/v2/contracts/call-read/${config.contractAddress}/${config.contractName}/${functionName}`;
  const encodedArgs = args.map((arg) => cvToHex(arg as never));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender,
      arguments: encodedArgs,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Read-only call failed (${response.status}): ${text}`);
  }

  const body = (await response.json()) as {
    okay: boolean;
    result: string;
    cause?: string;
  };

  if (!body.okay) {
    throw new Error(body.cause ?? `Read-only call ${functionName} failed.`);
  }

  return normalizeClarity(cvToValue(hexToCV(body.result)));
};

const parsePosition = (value: unknown): PositionRecord => {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    principal: asBigint(source.principal),
    earned: asBigint(source.earned),
    total: asBigint(source.total),
  };
};

const asModuleId = (value: unknown): ModuleId => {
  const id = asNumber(value, 0);
  if (id !== 0 && id !== 1 && id !== 2) {
    return 0;
  }
  return id;
};

const parseStrategy = (value: unknown): StrategyRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;

  return {
    strategyId: asNumber(source["strategy-id"]),
    owner: asString(source.owner),
    safeAllocation: asNumber(source["safe-allocation"]),
    growthAllocation: asNumber(source["growth-allocation"]),
    cashAllocation: asNumber(source["cash-allocation"]),
    safeModule: asModuleId(source["safe-module"]),
    growthModule: asModuleId(source["growth-module"]),
    cashModule: asModuleId(source["cash-module"]),
    createdAt: asNumber(source["created-at"]),
  };
};

const parsePositions = (value: unknown): UserPositions | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;

  return {
    strategyId: asNumber(source["strategy-id"]),
    safeModule: asModuleId(source["safe-module"]),
    growthModule: asModuleId(source["growth-module"]),
    cashModule: asModuleId(source["cash-module"]),
    safe: parsePosition(source.safe),
    growth: parsePosition(source.growth),
    cash: parsePosition(source.cash),
    total: asBigint(source.total),
  };
};

const parseEvent = (eventId: number, value: unknown): HistoryEvent | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;

  return {
    id: eventId,
    user: asString(source.user),
    strategyId: asNumber(source["strategy-id"]),
    action: asNumber(source.action),
    moduleId: asNumber(source["module-id"]),
    amount: asBigint(source.amount),
    payer: asString(source.payer),
    blockHeight: asNumber(source["block-height"]),
  };
};

const extractTxId = (response: unknown): string => {
  if (!response || typeof response !== "object") {
    return "";
  }

  const casted = response as TxResponse;
  return casted.txid ?? casted.txId ?? casted.transactionId ?? "";
};

const callContract = async (
  config: StacksContractConfig,
  functionName: string,
  functionArgs: ClarityValue[]
): Promise<string> => {
  const response = await request(
    REQUEST_OPTIONS,
    "stx_callContract",
    {
      contract: getContractId(config),
      functionName,
      functionArgs,
      network: config.network,
    }
  );

  return extractTxId(response);
};

export const connectWallet = async (): Promise<string> => {
  const response = (await request(CONNECT_OPTIONS, "stx_getAddresses")) as WalletResponse;
  const address = extractAddress(response);

  if (!address) {
    throw new Error("No STX account returned by wallet provider.");
  }

  return address;
};

export const configureStrategy = async (
  config: StacksContractConfig,
  draft: StrategyDraft
): Promise<string> => {
  return callContract(config, "configure-strategy", [
    Cl.uint(draft.safeAllocation),
    Cl.uint(draft.growthAllocation),
    Cl.uint(draft.cashAllocation),
    Cl.uint(draft.safeModule),
    Cl.uint(draft.growthModule),
    Cl.uint(draft.cashModule),
  ]);
};

export const adoptStrategy = async (
  config: StacksContractConfig,
  strategyId: number
): Promise<string> => {
  return callContract(config, "adopt-strategy", [Cl.uint(strategyId)]);
};

export const allowPayer = async (
  config: StacksContractConfig,
  strategyId: number,
  payer: string
): Promise<string> => {
  return callContract(config, "allow-payer", [Cl.uint(strategyId), Cl.principal(payer)]);
};

export const depositToStrategy = async (
  config: StacksContractConfig,
  strategyId: number,
  amount: number
): Promise<string> => {
  return callContract(config, "deposit", [Cl.uint(strategyId), Cl.uint(amount)]);
};

export const withdrawFromStrategy = async (
  config: StacksContractConfig,
  moduleId: ModuleId,
  amount: number
): Promise<string> => {
  return callContract(config, "withdraw-from-strategy", [Cl.uint(moduleId), Cl.uint(amount)]);
};

export const fetchUserStrategy = async (
  config: StacksContractConfig,
  userAddress: string
): Promise<StrategyRecord | null> => {
  const value = await postReadOnly(config, userAddress, "get-user-strategy", [
    Cl.principal(userAddress),
  ]);
  return parseStrategy(value);
};

export const fetchStrategyById = async (
  config: StacksContractConfig,
  senderAddress: string,
  strategyId: number
): Promise<StrategyRecord | null> => {
  const value = await postReadOnly(config, senderAddress, "get-strategy", [Cl.uint(strategyId)]);
  return parseStrategy(value);
};

export const fetchUserPositions = async (
  config: StacksContractConfig,
  userAddress: string
): Promise<UserPositions | null> => {
  const value = await postReadOnly(config, userAddress, "get-user-positions", [
    Cl.principal(userAddress),
  ]);
  return parsePositions(value);
};

export const fetchUserEvents = async (
  config: StacksContractConfig,
  userAddress: string,
  limit = 25
): Promise<HistoryEvent[]> => {
  const eventCountValue = await postReadOnly(config, userAddress, "get-user-event-count", [
    Cl.principal(userAddress),
  ]);

  const count = Number(asBigint(eventCountValue));
  if (count === 0) {
    return [];
  }

  const startIndex = Math.max(count - limit, 0);
  const events: HistoryEvent[] = [];

  for (let index = startIndex; index < count; index += 1) {
    const eventIdValue = await postReadOnly(config, userAddress, "get-user-event-id", [
      Cl.principal(userAddress),
      Cl.uint(index),
    ]);

    if (eventIdValue === null) {
      continue;
    }

    const eventId = Number(asBigint(eventIdValue));
    const eventPayload = await postReadOnly(config, userAddress, "get-event", [Cl.uint(eventId)]);
    const parsed = parseEvent(eventId, eventPayload);
    if (parsed) {
      events.push(parsed);
    }
  }

  return events.sort((a, b) => b.id - a.id);
};
