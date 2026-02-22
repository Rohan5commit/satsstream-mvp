import { assert, assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import {
  Account,
  Chain,
  Clarinet,
  Tx,
  types,
} from "https://deno.land/x/clarinet@v1.7.1/index.ts";

const setupRouters = (chain: Chain, deployer: Account) => {
  const routerPrincipal = `${deployer.address}.core-router`;

  const setupBlock = chain.mineBlock([
    Tx.contractCall(
      "simple-yield-module",
      "set-router",
      [types.principal(routerPrincipal)],
      deployer.address,
    ),
    Tx.contractCall(
      "stable-module",
      "set-router",
      [types.principal(routerPrincipal)],
      deployer.address,
    ),
    Tx.contractCall(
      "growth-module",
      "set-router",
      [types.principal(routerPrincipal)],
      deployer.address,
    ),
  ]);

  setupBlock.receipts.forEach((receipt) => receipt.result.expectOk());
};

Clarinet.test({
  name: "configure-strategy stores valid percentages and modules",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const alice = accounts.get("wallet_1")!;

    const block = chain.mineBlock([
      Tx.contractCall(
        "core-router",
        "configure-strategy",
        [
          types.uint(60),
          types.uint(30),
          types.uint(10),
          types.uint(0),
          types.uint(2),
          types.uint(1),
        ],
        alice.address,
      ),
    ]);

    block.receipts[0].result.expectOk().expectUint(1);

    const strategy = chain.callReadOnlyFn(
      "core-router",
      "get-user-strategy",
      [types.principal(alice.address)],
      deployer.address,
    );

    strategy.result.expectOk().expectSome();
  },
});

Clarinet.test({
  name: "deposit splits amount across configured modules",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const alice = accounts.get("wallet_1")!;

    setupRouters(chain, deployer);

    const configureBlock = chain.mineBlock([
      Tx.contractCall(
        "core-router",
        "configure-strategy",
        [
          types.uint(50),
          types.uint(30),
          types.uint(20),
          types.uint(0),
          types.uint(2),
          types.uint(1),
        ],
        alice.address,
      ),
    ]);

    configureBlock.receipts[0].result.expectOk();

    const depositBlock = chain.mineBlock([
      Tx.contractCall(
        "core-router",
        "deposit",
        [types.uint(1), types.uint(1_000)],
        alice.address,
      ),
    ]);

    depositBlock.receipts[0].result.expectOk();

    const positions = chain.callReadOnlyFn(
      "core-router",
      "get-user-positions",
      [types.principal(alice.address)],
      deployer.address,
    );

    const json = positions.result.expectOk().expectSome().expectTuple();
    const safe = json.safe.expectTuple();
    const growth = json.growth.expectTuple();
    const cash = json.cash.expectTuple();

    safe.principal.expectUint(500);
    growth.principal.expectUint(300);
    cash.principal.expectUint(200);
  },
});

Clarinet.test({
  name: "simple yield accrues over blocks and user can withdraw",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const alice = accounts.get("wallet_1")!;

    setupRouters(chain, deployer);

    chain.mineBlock([
      Tx.contractCall(
        "core-router",
        "configure-strategy",
        [
          types.uint(100),
          types.uint(0),
          types.uint(0),
          types.uint(0),
          types.uint(2),
          types.uint(1),
        ],
        alice.address,
      ),
      Tx.contractCall(
        "core-router",
        "deposit",
        [types.uint(1), types.uint(5_000)],
        alice.address,
      ),
    ]);

    chain.mineEmptyBlockUntil(chain.blockHeight + 20);

    const beforeWithdraw = chain.callReadOnlyFn(
      "simple-yield-module",
      "get-position",
      [types.principal(alice.address)],
      deployer.address,
    );

    const before = beforeWithdraw.result.expectOk().expectTuple();
    const earned = before.earned.expectUint();
    assert(earned > 0, "expected earned yield to be > 0");

    const withdrawBlock = chain.mineBlock([
      Tx.contractCall(
        "core-router",
        "withdraw-from-strategy",
        [types.uint(0), types.uint(1_000)],
        alice.address,
      ),
    ]);

    withdrawBlock.receipts[0].result.expectOk().expectUint(1000);

    const afterWithdraw = chain.callReadOnlyFn(
      "simple-yield-module",
      "get-position",
      [types.principal(alice.address)],
      deployer.address,
    );

    const after = afterWithdraw.result.expectOk().expectTuple();
    const principalAfter = after.principal.expectUint();
    assertEquals(principalAfter, 4000);
  },
});
