import { Link } from "react-router-dom";

import { MODULE_NAME_BY_ID } from "../lib/constants";
import type { StrategyRecord } from "../lib/types";

interface PublicStrategyPageProps {
  strategyId: number | null;
  strategy: StrategyRecord | null;
  loading: boolean;
  onLoad: (id: number) => Promise<void>;
  onAdopt: (id: number) => Promise<void>;
}

export function PublicStrategyPage({
  strategyId,
  strategy,
  loading,
  onLoad,
  onAdopt,
}: PublicStrategyPageProps) {
  if (strategyId === null) {
    return (
      <section className="panel">
        <h2>Public Strategy</h2>
        <p className="warning">Invalid strategy ID.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Public Strategy #{strategyId}</h2>
      <p className="subtle">Read-only preview of a shared strategy template.</p>

      <div className="row">
        <button type="button" className="secondary" onClick={() => void onLoad(strategyId)}>
          Refresh Strategy
        </button>
        <button type="button" onClick={() => void onAdopt(strategyId)}>
          Use This Strategy
        </button>
      </div>

      {loading ? <p className="subtle">Loading...</p> : null}

      {strategy ? (
        <div className="meta-list">
          <div>
            <span>Owner</span>
            <strong>{strategy.owner}</strong>
          </div>
          <div>
            <span>Safe</span>
            <strong>
              {strategy.safeAllocation}% ({MODULE_NAME_BY_ID[strategy.safeModule]})
            </strong>
          </div>
          <div>
            <span>Growth</span>
            <strong>
              {strategy.growthAllocation}% ({MODULE_NAME_BY_ID[strategy.growthModule]})
            </strong>
          </div>
          <div>
            <span>Cash</span>
            <strong>
              {strategy.cashAllocation}% ({MODULE_NAME_BY_ID[strategy.cashModule]})
            </strong>
          </div>
        </div>
      ) : (
        <p className="empty-note">Strategy not loaded yet.</p>
      )}

      <Link className="secondary link-btn" to="/builder">
        Back to Builder
      </Link>
    </section>
  );
}
