import { ACTION_LABELS, MODULE_NAME_BY_ID } from "../lib/constants";
import { formatBigint, truncateAddress } from "../lib/format";
import type { HistoryEvent } from "../lib/types";

interface HistoryTableProps {
  events: HistoryEvent[];
}

export function HistoryTable({ events }: HistoryTableProps) {
  if (events.length === 0) {
    return <p className="empty-note">No on-chain events yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Module</th>
            <th>Amount</th>
            <th>Payer</th>
            <th>Block</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{ACTION_LABELS[event.action] ?? `Action ${event.action}`}</td>
              <td>{MODULE_NAME_BY_ID[event.moduleId] ?? "-"}</td>
              <td>{formatBigint(event.amount)}</td>
              <td>{truncateAddress(event.payer)}</td>
              <td>{event.blockHeight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
