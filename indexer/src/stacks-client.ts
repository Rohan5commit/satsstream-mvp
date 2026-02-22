import { Cl, cvToHex, cvToValue, hexToCV } from "@stacks/transactions";

import { asBigint, asNumber, asString, normalizeClarity } from "./clarity.js";
import { config } from "./config.js";
import type {
  HistoryEvent,
  ModuleId,
  PositionRecord,
  StrategyRecord,
  UserPositions,
} from "./types.js";

const endpointBase = `${config.stacksApiUrl}/v2/contracts/call-read/${config.contractAddress}/${config.contractName}`;

const callReadOnly = async (
  sender: string,
  functionName: string,
  args: unknown[]
): Promise<unknown> => {
  const response = await fetch(`${endpointBase}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender,
      arguments: args.map((arg) => cvToHex(arg as never)),
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
    throw new Error(body.cause ?? `Read-only call ${functionName} failed`);
  }

  return normalizeClarity(cvToValue(hexToCV(body.result)));
};

const asModuleId = (value: unknown): ModuleId => {
  const id = asNumber(value, 0);
  if (id !== 0 && id !== 1 && id !== 2) {
    return 0;
  }
  return id;
};

const parsePosition = (value: unknown): PositionRecord => {
  const source = (value ?? {}) as Record<string, unknown>;

  return {
    principal: asBigint(source.principal),
    earned: asBigint(source.earned),
    total: asBigint(source.total),
  };
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

export const getUserStrategy = async (user: string): Promise<StrategyRecord | null> => {
  const value = await callReadOnly(user, "get-user-strategy", [Cl.principal(user)]);
  return parseStrategy(value);
};

export const getStrategyById = async (
  strategyId: number,
  sender = config.readOnlyCaller
): Promise<StrategyRecord | null> => {
  const value = await callReadOnly(sender, "get-strategy", [Cl.uint(strategyId)]);
  return parseStrategy(value);
};

export const getUserPositions = async (user: string): Promise<UserPositions | null> => {
  const value = await callReadOnly(user, "get-user-positions", [Cl.principal(user)]);
  return parsePositions(value);
};

export const getUserHistory = async (user: string, limit = 30): Promise<HistoryEvent[]> => {
  const countValue = await callReadOnly(user, "get-user-event-count", [Cl.principal(user)]);
  const totalCount = Number(asBigint(countValue));

  if (totalCount === 0) {
    return [];
  }

  const startIndex = Math.max(totalCount - limit, 0);
  const events: HistoryEvent[] = [];

  for (let index = startIndex; index < totalCount; index += 1) {
    const eventIdValue = await callReadOnly(user, "get-user-event-id", [
      Cl.principal(user),
      Cl.uint(index),
    ]);

    if (eventIdValue === null) {
      continue;
    }

    const eventId = Number(asBigint(eventIdValue));
    const eventPayload = await callReadOnly(user, "get-event", [Cl.uint(eventId)]);
    const parsed = parseEvent(eventId, eventPayload);

    if (parsed) {
      events.push(parsed);
    }
  }

  return events.sort((a, b) => b.id - a.id);
};
