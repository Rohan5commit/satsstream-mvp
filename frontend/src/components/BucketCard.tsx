import { MODULE_NAME_BY_ID } from "../lib/constants";
import { formatBigint } from "../lib/format";
import type { ModuleId, PositionRecord } from "../lib/types";

interface BucketCardProps {
  title: string;
  allocation: number;
  moduleId: ModuleId;
  position: PositionRecord;
  onWithdraw: (moduleId: ModuleId, amount: number) => Promise<void>;
}

export function BucketCard({
  title,
  allocation,
  moduleId,
  position,
  onWithdraw,
}: BucketCardProps) {
  const maxWithdraw = Number(
    position.total > BigInt(Number.MAX_SAFE_INTEGER)
      ? BigInt(Number.MAX_SAFE_INTEGER)
      : position.total
  );

  return (
    <div className="bucket-card">
      <div className="bucket-header">
        <h3>{title}</h3>
        <span>{allocation}%</span>
      </div>
      <p className="bucket-module">{MODULE_NAME_BY_ID[moduleId]}</p>
      <div className="bucket-metrics">
        <div>
          <label>Principal</label>
          <strong>{formatBigint(position.principal)}</strong>
        </div>
        <div>
          <label>Yield</label>
          <strong>{formatBigint(position.earned)}</strong>
        </div>
      </div>
      <button
        type="button"
        className="secondary"
        disabled={maxWithdraw <= 0}
        onClick={() => onWithdraw(moduleId, Math.min(100, maxWithdraw))}
      >
        Withdraw 100
      </button>
    </div>
  );
}
