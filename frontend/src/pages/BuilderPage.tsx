import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { MODULE_OPTIONS } from "../lib/constants";
import type { StrategyDraft, StrategyRecord } from "../lib/types";

interface BuilderPageProps {
  strategy: StrategyRecord | null;
  onConfigureStrategy: (draft: StrategyDraft) => Promise<void>;
  onAllowPayer: (payer: string) => Promise<void>;
}

const DEFAULT_DRAFT: StrategyDraft = {
  safeAllocation: 50,
  growthAllocation: 30,
  cashAllocation: 20,
  safeModule: 0,
  growthModule: 2,
  cashModule: 1,
};

const isUniqueModules = (draft: StrategyDraft): boolean => {
  const ids = [draft.safeModule, draft.growthModule, draft.cashModule];
  return new Set(ids).size === ids.length;
};

export function BuilderPage({ strategy, onConfigureStrategy, onAllowPayer }: BuilderPageProps) {
  const [draft, setDraft] = useState<StrategyDraft>(DEFAULT_DRAFT);
  const [payer, setPayer] = useState("");

  const allocationTotal = draft.safeAllocation + draft.growthAllocation + draft.cashAllocation;
  const canSave = allocationTotal === 100 && isUniqueModules(draft);

  const estimatedApy = useMemo(() => {
    const safeApy = MODULE_OPTIONS.find((item) => item.id === draft.safeModule)?.apy ?? 0;
    const growthApy = MODULE_OPTIONS.find((item) => item.id === draft.growthModule)?.apy ?? 0;
    const cashApy = MODULE_OPTIONS.find((item) => item.id === draft.cashModule)?.apy ?? 0;

    return (
      (safeApy * draft.safeAllocation +
        growthApy * draft.growthAllocation +
        cashApy * draft.cashAllocation) /
      100
    );
  }, [draft]);

  return (
    <section className="grid two-col">
      <article className="panel">
        <h2>Strategy Builder</h2>
        <p className="subtle">Set your three buckets. Allocations must total exactly 100%.</p>

        <div className="bucket-grid">
          <div>
            <label htmlFor="safe-allocation">Safe %</label>
            <input
              id="safe-allocation"
              min={0}
              max={100}
              type="number"
              value={draft.safeAllocation}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  safeAllocation: Number(event.target.value),
                }))
              }
            />
            <select
              value={draft.safeModule}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  safeModule: Number(event.target.value) as StrategyDraft["safeModule"],
                }))
              }
            >
              {MODULE_OPTIONS.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="growth-allocation">Growth %</label>
            <input
              id="growth-allocation"
              min={0}
              max={100}
              type="number"
              value={draft.growthAllocation}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  growthAllocation: Number(event.target.value),
                }))
              }
            />
            <select
              value={draft.growthModule}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  growthModule: Number(event.target.value) as StrategyDraft["growthModule"],
                }))
              }
            >
              {MODULE_OPTIONS.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cash-allocation">Cash %</label>
            <input
              id="cash-allocation"
              min={0}
              max={100}
              type="number"
              value={draft.cashAllocation}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  cashAllocation: Number(event.target.value),
                }))
              }
            />
            <select
              value={draft.cashModule}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  cashModule: Number(event.target.value) as StrategyDraft["cashModule"],
                }))
              }
            >
              {MODULE_OPTIONS.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="meta-list compact">
          <div>
            <span>Total</span>
            <strong>{allocationTotal}%</strong>
          </div>
          <div>
            <span>Estimated APY</span>
            <strong>{estimatedApy.toFixed(1)}%</strong>
          </div>
        </div>

        {!isUniqueModules(draft) ? (
          <p className="warning">Each bucket must use a different module for clean accounting.</p>
        ) : null}

        <button type="button" disabled={!canSave} onClick={() => void onConfigureStrategy(draft)}>
          Save Strategy
        </button>
      </article>

      <article className="panel">
        <h2>Share and Whitelist</h2>
        <p className="subtle">Allow your employer/protocol address to deposit into your strategy.</p>

        <label htmlFor="payer-address">Whitelisted payer address</label>
        <input
          id="payer-address"
          placeholder="SP..."
          value={payer}
          onChange={(event) => setPayer(event.target.value.trim())}
        />
        <button
          type="button"
          className="secondary"
          disabled={!strategy || payer.length < 10}
          onClick={() => void onAllowPayer(payer)}
        >
          Allow Payer
        </button>

        <div className="divider" />

        {strategy ? (
          <>
            <p className="subtle">Share this template URL:</p>
            <code className="share-link">{`${window.location.origin}/strategy/${strategy.strategyId}`}</code>
            <Link className="secondary link-btn" to="/dashboard">
              Open Dashboard
            </Link>
          </>
        ) : (
          <p className="empty-note">Create a strategy first to unlock sharing.</p>
        )}
      </article>
    </section>
  );
}
