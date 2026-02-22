interface TransactionPillProps {
  txId: string;
  apiUrl: string;
}

const toExplorerUrl = (apiUrl: string, txId: string): string => {
  if (apiUrl.includes("testnet")) {
    return `https://explorer.hiro.so/txid/${txId}?chain=testnet`;
  }
  return `https://explorer.hiro.so/txid/${txId}?chain=mainnet`;
};

export function TransactionPill({ txId, apiUrl }: TransactionPillProps) {
  if (!txId) {
    return null;
  }

  return (
    <a
      className="tx-pill"
      href={toExplorerUrl(apiUrl, txId.replace(/^0x/, ""))}
      target="_blank"
      rel="noreferrer"
    >
      Last tx: {txId.slice(0, 12)}...
    </a>
  );
}
