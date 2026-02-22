import { Link } from "react-router-dom";

import { truncateAddress } from "../lib/format";

interface WelcomePageProps {
  walletAddress: string | null;
  onConnect: () => Promise<void>;
  contractAddress: string;
  contractName: string;
  network: string;
  apiUrl: string;
  onContractAddressChange: (value: string) => void;
  onContractNameChange: (value: string) => void;
  onApiUrlChange: (value: string) => void;
}

export function WelcomePage({
  walletAddress,
  onConnect,
  contractAddress,
  contractName,
  network,
  apiUrl,
  onContractAddressChange,
  onContractNameChange,
  onApiUrlChange,
}: WelcomePageProps) {
  return (
    <section className="grid two-col">
      <article className="panel hero">
        <p className="kicker">Stacks Testnet MVP</p>
        <h1>SatsStream</h1>
        <p>
          Route each incoming Bitcoin payout into buckets for savings, growth, and instant liquidity.
          Strategies are on-chain and shareable.
        </p>
        <div className="callout">
          <strong>No browser local storage</strong>
          <span>
            Wallet session caching is disabled. Contract state and event history are source-of-truth.
          </span>
        </div>
        <div className="row">
          <button type="button" onClick={() => void onConnect()}>
            {walletAddress ? `Connected: ${truncateAddress(walletAddress)}` : "Connect Wallet"}
          </button>
          <Link className="secondary link-btn" to="/builder">
            Build Strategy
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>Network Settings</h2>
        <p className="subtle">Set your deployed contract target before sending transactions.</p>

        <label htmlFor="contract-address">Contract address</label>
        <input
          id="contract-address"
          value={contractAddress}
          onChange={(event) => onContractAddressChange(event.target.value.trim())}
        />

        <label htmlFor="contract-name">Contract name</label>
        <input
          id="contract-name"
          value={contractName}
          onChange={(event) => onContractNameChange(event.target.value.trim())}
        />

        <label htmlFor="api-url">Stacks API URL</label>
        <input
          id="api-url"
          value={apiUrl}
          onChange={(event) => onApiUrlChange(event.target.value.trim())}
        />

        <div className="meta-list">
          <div>
            <span>Network</span>
            <strong>{network}</strong>
          </div>
          <div>
            <span>Contract</span>
            <strong>
              {contractAddress}.{contractName}
            </strong>
          </div>
        </div>
      </article>
    </section>
  );
}
