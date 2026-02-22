import cors from "cors";
import express from "express";

import { config } from "./config.js";
import {
  getStrategyById,
  getUserHistory,
  getUserPositions,
  getUserStrategy,
} from "./stacks-client.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "satsstream-indexer",
    contract: `${config.contractAddress}.${config.contractName}`,
  });
});

app.get("/api/users/:principal/strategy", async (req, res) => {
  try {
    const data = await getUserStrategy(req.params.principal);
    res.json({ data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "failed to fetch user strategy",
    });
  }
});

app.get("/api/users/:principal/positions", async (req, res) => {
  try {
    const data = await getUserPositions(req.params.principal);
    res.json({ data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "failed to fetch user positions",
    });
  }
});

app.get("/api/users/:principal/history", async (req, res) => {
  const limit = Number(req.query.limit ?? 30);

  try {
    const data = await getUserHistory(req.params.principal, Number.isFinite(limit) ? limit : 30);
    res.json({ data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "failed to fetch user history",
    });
  }
});

app.get("/api/strategies/:strategyId", async (req, res) => {
  const strategyId = Number(req.params.strategyId);
  const sender = (req.query.sender as string | undefined) ?? config.readOnlyCaller;

  if (!Number.isInteger(strategyId) || strategyId < 1) {
    res.status(400).json({ error: "strategyId must be a positive integer" });
    return;
  }

  try {
    const data = await getStrategyById(strategyId, sender);
    res.json({ data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "failed to fetch strategy",
    });
  }
});

app.listen(config.port, () => {
  console.log(
    `satsstream-indexer listening on http://localhost:${config.port} for ${config.contractAddress}.${config.contractName}`
  );
});
