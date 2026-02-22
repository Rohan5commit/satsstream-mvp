export type ModuleId = 0 | 1 | 2;

export interface StrategyDraft {
  safeAllocation: number;
  growthAllocation: number;
  cashAllocation: number;
  safeModule: ModuleId;
  growthModule: ModuleId;
  cashModule: ModuleId;
}

export interface StrategyRecord {
  strategyId: number;
  owner: string;
  safeAllocation: number;
  growthAllocation: number;
  cashAllocation: number;
  safeModule: ModuleId;
  growthModule: ModuleId;
  cashModule: ModuleId;
  createdAt: number;
}

export interface PositionRecord {
  principal: bigint;
  earned: bigint;
  total: bigint;
}

export interface UserPositions {
  strategyId: number;
  safeModule: ModuleId;
  growthModule: ModuleId;
  cashModule: ModuleId;
  safe: PositionRecord;
  growth: PositionRecord;
  cash: PositionRecord;
  total: bigint;
}

export interface HistoryEvent {
  id: number;
  user: string;
  strategyId: number;
  action: number;
  moduleId: number;
  amount: bigint;
  payer: string;
  blockHeight: number;
}

export interface StacksContractConfig {
  apiUrl: string;
  network: "testnet" | "mainnet";
  contractAddress: string;
  contractName: string;
}
