# SatsStream

SatsStream is a Stacks-based smart allocation layer for Bitcoin-native income streams.
Designed for Bitcoin-linked income (e.g., sBTC/USDCx on Stacks), with Clarity contracts as the settlement layer.
A user receives periodic funds and routes each deposit into 3 buckets:

- Safe savings
- Growth
- Instant spending

Everything critical is on-chain in Clarity. The frontend keeps no browser storage and reads live state directly from contract read-only calls.

## MVP shipped

- Rule engine: percent-based split on every deposit
- Core Router contract
  - `configure-strategy`
  - `adopt-strategy`
  - `allow-payer` / `revoke-payer`
  - `deposit`
  - `withdraw-from-strategy`
  - `get-user-strategy`
  - `get-user-positions`
  - event/history read endpoints
- Strategy modules
  - `simple-yield-module` (simulated yield)
  - `stable-module` (liquid mock)
  - `growth-module` (simulated higher yield)
- Frontend (React + stacks.js)
  - wallet connect
  - strategy builder
  - shareable strategy page
  - dashboard, deposit/withdraw, history
- Optional free indexer API (Express)

## Project layout

- `contracts/` Clarity contracts
- `tests/` Clarinet tests
- `frontend/` Vite + React app
- `indexer/` optional API service
- `.github/workflows/` free CI + GitHub Pages deploy

## No local storage policy

This app does not intentionally use `localStorage` / `sessionStorage`.
Wallet calls are made with:

- `enableLocalStorage: false`
- `persistWalletSelect: false`

So the source of truth remains on-chain, not browser persistence.

## Local development (free)

Prerequisites:

- Node.js 20+
- npm 10+
- Clarinet (for smart contract tests)

Install:

```bash
npm install
```

Frontend:

```bash
npm run dev:frontend
```

Indexer:

```bash
cp indexer/.env.example indexer/.env
npm run dev:indexer
```

Build all:

```bash
npm run build
```

Contracts tests:

```bash
npm run test:contracts
```

## Environment variables

Root `.env.example` and `indexer/.env.example` include required keys.

Frontend expects:

- `VITE_STACKS_API_URL`
- `VITE_STACKS_NETWORK`
- `VITE_CONTRACT_ADDRESS`
- `VITE_CONTRACT_NAME`

Indexer expects:

- `STACKS_API_URL`
- `CONTRACT_ADDRESS`
- `CONTRACT_NAME`
- `INDEXER_PORT`
- `READ_ONLY_CALLER`

## Free deployment on GitHub

### 1. Create a brand-new repo

On GitHub, create an empty repo (do not reuse older repos).

### 2. Push this code

```bash
git init
git checkout -b main
git add .
git commit -m "Initial SatsStream MVP"
git remote add origin git@github.com:<your-user>/<new-repo>.git
git push -u origin main
```

### 3. Enable Pages deploy workflow

- In GitHub repo settings, enable Pages with `GitHub Actions`
- Set repository variables:
  - `VITE_STACKS_API_URL`
  - `VITE_STACKS_NETWORK`
  - `VITE_CONTRACT_ADDRESS`
  - `VITE_CONTRACT_NAME`

Then pushing to `main` auto-builds and publishes frontend for free.

## Judge-ready narrative

- Innovation: one deposit, multi-bucket programmable routing for Bitcoin-linked income
- Technical depth: Router + module trait architecture, composable and extensible
- Stacks alignment: Clarity contracts + stacks.js frontend
- UX: non-technical bucket language, simple sliders, shareable strategy links
- Impact: reusable primitive for payroll, DAOs, and treasury automation
