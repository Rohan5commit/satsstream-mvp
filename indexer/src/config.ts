import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.INDEXER_PORT ?? 8787),
  stacksApiUrl: process.env.STACKS_API_URL ?? "https://api.testnet.hiro.so",
  contractAddress: process.env.CONTRACT_ADDRESS ?? "STYOURTESTNETADDRESS",
  contractName: process.env.CONTRACT_NAME ?? "core-router",
  readOnlyCaller:
    process.env.READ_ONLY_CALLER ?? "ST000000000000000000002AMW42H",
};
