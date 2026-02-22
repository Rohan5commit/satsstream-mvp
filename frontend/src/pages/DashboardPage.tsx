import { BucketCard } from "../components/BucketCard";
import { HistoryTable } from "../components/HistoryTable";
import { formatBigint } from "../lib/format";
import type { HistoryEvent, ModuleId, StrategyRecord, UserPositions } from "../lib/types";

interface DashboardPageProps {
  strategy: StrategyRecord | null;
  positions: UserPositions | null;
  events: HistoryEvent[];
  onDeposit: (amount: number) => Promise<void>;
  onWithdraw: (moduleId: ModuleId, amount: number) => Promise<void>;
  onWithdrawAll: () => Promise<void>;
}

export function DashboardPage({
  strategy,
  positions,
  events,
  onDeposit,
  onWithdraw,
  onWithdrawAll,
}: DashboardPageProps) {
  if (!strategy) {
    return (
      <section className="panel">
        <h2>Dashboard</h2>
        <p className="empty-note">No strategy found for this wallet. Create one in Builder.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <article className="panel">
        <h2>Streaming Dashboard</h2>
        <p className="subtle">All balances and events come from on-chain read-only calls.</p>

        <div className="summary-grid">
          <div>
            <label>Total Position</label>
            <strong>{positions ? formatBigint(positions.total) : "0"}</strong>
          </div>
          <div>
            <label>Strategy ID</label>
            <strong>{strategy.strategyId}</strong>
          </div>
          <div>
            <label>Last Event Count</label>
            <strong>{events.length}</strong>
          </div>
          <div>
            <label>Next Yield Tick</label>
            <strong>Every new block</strong>
          </div>
        </div>

        <div className="row">
          <button type="button" onClick={() => void onDeposit(1000)}>
            Deposit 1000
          </button>
          <button type="button" className="secondary" onClick={() => void onWithdrawAll()}>
            Withdraw From All
          </button>
        </div>
      </article>

      {positions ? (
        <div className="grid three-col">
          <BucketCard
            title="Safe"
            allocation={strategy.safeAllocation}
            moduleId={strategy.safeModule}
            position={positions.safe}
            onWithdraw={onWithdraw}
          />
          <BucketCard
            title="Growth"
            allocation={strategy.growthAllocation}
            moduleId={strategy.growthModule}
            position={positions.growth}
            onWithdraw={onWithdraw}
          />
          <BucketCard
            title="Cash"
            allocation={strategy.cashAllocation}
            moduleId={strategy.cashModule}
            position={positions.cash}
            onWithdraw={onWithdraw}
          />
        </div>
      ) : (
        <article className="panel">
          <p className="empty-note">No positions yet. Deposit to start streaming into buckets.</p>
        </article>
      )}

      <article className="panel">
        <h3>History and Analytics</h3>
        <HistoryTable events={events} />
      </article>
    </section>
  );
}
