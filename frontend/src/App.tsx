import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";

import { TransactionPill } from "./components/TransactionPill";
import {
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_CONTRACT_NAME,
  DEFAULT_NETWORK,
  DEFAULT_STACKS_API_URL,
} from "./lib/constants";
import { asNumber } from "./lib/clarity";
import {
  adoptStrategy,
  allowPayer,
  configureStrategy,
  connectWallet,
  depositToStrategy,
  fetchStrategyById,
  fetchUserEvents,
  fetchUserPositions,
  fetchUserStrategy,
  withdrawFromStrategy,
} from "./lib/stacks-client";
import type {
  HistoryEvent,
  ModuleId,
  StacksContractConfig,
  StrategyDraft,
  StrategyRecord,
  UserPositions,
} from "./lib/types";
import { BuilderPage } from "./pages/BuilderPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PublicStrategyPage } from "./pages/PublicStrategyPage";
import { WelcomePage } from "./pages/WelcomePage";

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
};

function SharedStrategyRoute({
  strategy,
  onLoad,
  onAdopt,
  loading,
}: {
  strategy: StrategyRecord | null;
  onLoad: (id: number) => Promise<void>;
  onAdopt: (id: number) => Promise<void>;
  loading: boolean;
}) {
  const { strategyId } = useParams();
  const numericId = strategyId ? asNumber(strategyId, -1) : -1;

  useEffect(() => {
    if (numericId > 0) {
      void onLoad(numericId);
    }
  }, [numericId, onLoad]);

  return (
    <PublicStrategyPage
      strategyId={numericId > 0 ? numericId : null}
      strategy={strategy}
      loading={loading}
      onLoad={onLoad}
      onAdopt={onAdopt}
    />
  );
}

export default function App() {
  const location = useLocation();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);
  const [contractName, setContractName] = useState(DEFAULT_CONTRACT_NAME);
  const [apiUrl, setApiUrl] = useState(DEFAULT_STACKS_API_URL);

  const [strategy, setStrategy] = useState<StrategyRecord | null>(null);
  const [sharedStrategy, setSharedStrategy] = useState<StrategyRecord | null>(null);
  const [positions, setPositions] = useState<UserPositions | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);

  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<string>("");
  const [latestTxId, setLatestTxId] = useState<string>("");
  const [loadingPublic, setLoadingPublic] = useState(false);

  const config = useMemo<StacksContractConfig>(
    () => ({
      apiUrl,
      network: DEFAULT_NETWORK,
      contractAddress,
      contractName,
    }),
    [apiUrl, contractAddress, contractName]
  );

  const isConfigReady =
    contractAddress.startsWith("S") && contractAddress.length > 20 && contractName.length > 2;

  const refreshDashboardData = useCallback(async () => {
    if (!walletAddress || !isConfigReady) {
      setStrategy(null);
      setPositions(null);
      setEvents([]);
      return;
    }

    const [nextStrategy, nextPositions, nextEvents] = await Promise.all([
      fetchUserStrategy(config, walletAddress),
      fetchUserPositions(config, walletAddress),
      fetchUserEvents(config, walletAddress, 30),
    ]);

    setStrategy(nextStrategy);
    setPositions(nextPositions);
    setEvents(nextEvents);
  }, [walletAddress, isConfigReady, config]);

  useEffect(() => {
    void refreshDashboardData();
  }, [refreshDashboardData]);

  const handleConnect = useCallback(async () => {
    try {
      setError("");
      setStatus("Connecting wallet...");
      const address = await connectWallet();
      setWalletAddress(address);
      setStatus(`Connected ${address}`);
    } catch (connectError) {
      setError(extractErrorMessage(connectError));
      setStatus("Wallet connection failed");
    }
  }, []);

  const runTx = useCallback(
    async (action: () => Promise<string>, pendingLabel: string, doneLabel: string) => {
      try {
        setError("");
        setStatus(pendingLabel);
        const txId = await action();
        setLatestTxId(txId);
        setStatus(doneLabel);
        await refreshDashboardData();
      } catch (txError) {
        setError(extractErrorMessage(txError));
        setStatus("Transaction failed");
      }
    },
    [refreshDashboardData]
  );

  const handleConfigureStrategy = useCallback(
    async (draft: StrategyDraft) => {
      if (!walletAddress) {
        setError("Connect wallet first.");
        return;
      }
      if (!isConfigReady) {
        setError("Set contract address and name first.");
        return;
      }

      await runTx(
        () => configureStrategy(config, draft),
        "Submitting strategy configuration...",
        "Strategy configuration submitted"
      );
    },
    [walletAddress, isConfigReady, runTx, config]
  );

  const handleAllowPayer = useCallback(
    async (payer: string) => {
      if (!strategy) {
        setError("Create a strategy first.");
        return;
      }

      await runTx(
        () => allowPayer(config, strategy.strategyId, payer),
        "Whitelisting payer...",
        "Payer whitelist submitted"
      );
    },
    [strategy, runTx, config]
  );

  const handleDeposit = useCallback(
    async (amount: number) => {
      if (!strategy) {
        setError("No strategy selected.");
        return;
      }

      await runTx(
        () => depositToStrategy(config, strategy.strategyId, amount),
        `Depositing ${amount}...`,
        "Deposit submitted"
      );
    },
    [strategy, runTx, config]
  );

  const handleWithdraw = useCallback(
    async (moduleId: ModuleId, amount: number) => {
      await runTx(
        () => withdrawFromStrategy(config, moduleId, amount),
        `Withdrawing ${amount} from module ${moduleId}...`,
        "Withdraw submitted"
      );
    },
    [runTx, config]
  );

  const handleWithdrawAll = useCallback(async () => {
    if (!strategy || !positions) {
      setError("No positions available.");
      return;
    }

    const steps: Array<{ moduleId: ModuleId; amount: number }> = [
      { moduleId: strategy.safeModule, amount: Number(positions.safe.total) },
      { moduleId: strategy.growthModule, amount: Number(positions.growth.total) },
      { moduleId: strategy.cashModule, amount: Number(positions.cash.total) },
    ].filter((entry) => entry.amount > 0);

    for (const step of steps) {
      // Sequential calls avoid multiple wallet popups racing each other.
      await handleWithdraw(step.moduleId, step.amount);
    }
  }, [strategy, positions, handleWithdraw]);

  const handleLoadSharedStrategy = useCallback(
    async (strategyId: number) => {
      if (!walletAddress || !isConfigReady) {
        setSharedStrategy(null);
        return;
      }

      setLoadingPublic(true);
      try {
        const loaded = await fetchStrategyById(config, walletAddress, strategyId);
        setSharedStrategy(loaded);
      } catch (loadError) {
        setError(extractErrorMessage(loadError));
        setSharedStrategy(null);
      } finally {
        setLoadingPublic(false);
      }
    },
    [walletAddress, isConfigReady, config]
  );

  const handleAdoptStrategy = useCallback(
    async (strategyId: number) => {
      if (!walletAddress || !isConfigReady) {
        setError("Connect wallet and set contract first.");
        return;
      }

      await runTx(
        () => adoptStrategy(config, strategyId),
        `Adopting strategy ${strategyId}...`,
        "Strategy adoption submitted"
      );
    },
    [walletAddress, isConfigReady, runTx, config]
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="logo">SatsStream</p>
          <span className="badge">{DEFAULT_NETWORK.toUpperCase()}</span>
        </div>

        <nav>
          <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>Welcome</NavLink>
          <NavLink to="/builder" className={({ isActive }) => (isActive ? "active" : "")}>Builder</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
        </nav>
      </header>

      <section className="status-row">
        <p>{status}</p>
        {error ? <p className="error">{error}</p> : null}
        <TransactionPill txId={latestTxId} apiUrl={apiUrl} />
      </section>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <WelcomePage
                walletAddress={walletAddress}
                onConnect={handleConnect}
                contractAddress={contractAddress}
                contractName={contractName}
                network={DEFAULT_NETWORK}
                apiUrl={apiUrl}
                onContractAddressChange={setContractAddress}
                onContractNameChange={setContractName}
                onApiUrlChange={setApiUrl}
              />
            }
          />
          <Route
            path="/builder"
            element={
              <BuilderPage
                strategy={strategy}
                onConfigureStrategy={handleConfigureStrategy}
                onAllowPayer={handleAllowPayer}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                strategy={strategy}
                positions={positions}
                events={events}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
                onWithdrawAll={handleWithdrawAll}
              />
            }
          />
          <Route
            path="/strategy/:strategyId"
            element={
              <SharedStrategyRoute
                strategy={sharedStrategy}
                onLoad={handleLoadSharedStrategy}
                onAdopt={handleAdoptStrategy}
                loading={loadingPublic}
              />
            }
          />
        </Routes>
      </main>

      <footer>
        <span>Route: {location.pathname}</span>
        <span>Contract: {contractAddress}.{contractName}</span>
      </footer>
    </div>
  );
}
