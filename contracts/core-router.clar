(use-trait strategy-module-trait .strategy-module-trait.strategy-module-trait)

(define-constant MODULE_SIMPLE_YIELD u0)
(define-constant MODULE_STABLE u1)
(define-constant MODULE_GROWTH u2)

(define-constant ACTION_CONFIGURE u0)
(define-constant ACTION_DEPOSIT u1)
(define-constant ACTION_WITHDRAW u2)
(define-constant ACTION_ALLOW_PAYER u3)
(define-constant ACTION_REVOKE_PAYER u4)

(define-constant ERR_STRATEGY_NOT_FOUND (err u500))
(define-constant ERR_UNAUTHORIZED (err u501))
(define-constant ERR_BAD_ALLOCATION (err u502))
(define-constant ERR_UNKNOWN_MODULE (err u503))
(define-constant ERR_INVALID_AMOUNT (err u504))
(define-constant ERR_NOT_ALLOWED_PAYER (err u505))
(define-constant ERR_MODULE_NOT_IN_STRATEGY (err u506))
(define-constant ERR_DUPLICATE_MODULE (err u507))

(define-data-var next-strategy-id uint u1)
(define-data-var next-event-id uint u1)

(define-map user-strategy principal uint)
(define-map strategies
  uint
  (tuple
    (owner principal)
    (safe-allocation uint)
    (growth-allocation uint)
    (cash-allocation uint)
    (safe-module uint)
    (growth-module uint)
    (cash-module uint)
    (created-at uint)
  )
)

(define-map whitelisted-payers
  { strategy-id: uint, payer: principal }
  bool
)

(define-map user-event-count principal uint)
(define-map user-events { user: principal, index: uint } uint)

(define-map events
  uint
  (tuple
    (user principal)
    (strategy-id uint)
    (action uint)
    (module-id uint)
    (amount uint)
    (payer principal)
    (block-height uint)
  )
)

(define-private (is-supported-module (module-id uint))
  (or
    (is-eq module-id MODULE_SIMPLE_YIELD)
    (or (is-eq module-id MODULE_STABLE) (is-eq module-id MODULE_GROWTH))
  )
)

(define-private (is-allowed-payer (strategy-id uint) (payer principal) (owner principal))
  (or
    (is-eq payer owner)
    (default-to false (map-get? whitelisted-payers { strategy-id: strategy-id, payer: payer }))
  )
)

(define-private (module-in-strategy (module-id uint) (strategy (tuple
  (owner principal)
  (safe-allocation uint)
  (growth-allocation uint)
  (cash-allocation uint)
  (safe-module uint)
  (growth-module uint)
  (cash-module uint)
  (created-at uint)
)))
  (or
    (is-eq module-id (get safe-module strategy))
    (or
      (is-eq module-id (get growth-module strategy))
      (is-eq module-id (get cash-module strategy))
    )
  )
)

(define-private (record-event (user principal) (strategy-id uint) (action uint) (module-id uint) (amount uint) (payer principal))
  (let (
      (event-id (var-get next-event-id))
      (count (default-to u0 (map-get? user-event-count user)))
    )
    (begin
      (map-set events event-id {
        user: user,
        strategy-id: strategy-id,
        action: action,
        module-id: module-id,
        amount: amount,
        payer: payer,
        block-height: block-height
      })
      (map-set user-events { user: user, index: count } event-id)
      (map-set user-event-count user (+ count u1))
      (var-set next-event-id (+ event-id u1))
      event-id
    )
  )
)

(define-private (module-deposit (module-id uint) (user principal) (amount uint))
  (if (is-eq amount u0)
    (ok u0)
    (if (is-eq module-id MODULE_SIMPLE_YIELD)
      (contract-call? .simple-yield-module deposit user amount)
      (if (is-eq module-id MODULE_STABLE)
        (contract-call? .stable-module deposit user amount)
        (if (is-eq module-id MODULE_GROWTH)
          (contract-call? .growth-module deposit user amount)
          ERR_UNKNOWN_MODULE
        )
      )
    )
  )
)

(define-private (module-withdraw (module-id uint) (user principal) (amount uint))
  (if (is-eq module-id MODULE_SIMPLE_YIELD)
    (contract-call? .simple-yield-module withdraw user amount)
    (if (is-eq module-id MODULE_STABLE)
      (contract-call? .stable-module withdraw user amount)
      (if (is-eq module-id MODULE_GROWTH)
        (contract-call? .growth-module withdraw user amount)
        ERR_UNKNOWN_MODULE
      )
    )
  )
)

(define-read-only (module-position (module-id uint) (user principal))
  (if (is-eq module-id MODULE_SIMPLE_YIELD)
    (contract-call? .simple-yield-module get-position user)
    (if (is-eq module-id MODULE_STABLE)
      (contract-call? .stable-module get-position user)
      (if (is-eq module-id MODULE_GROWTH)
        (contract-call? .growth-module get-position user)
        ERR_UNKNOWN_MODULE
      )
    )
  )
)

(define-private (only-strategy-owner (strategy-id uint))
  (let ((strategy (unwrap! (map-get? strategies strategy-id) ERR_STRATEGY_NOT_FOUND)))
    (if (is-eq tx-sender (get owner strategy))
      (ok true)
      ERR_UNAUTHORIZED
    )
  )
)

(define-public (configure-strategy
  (safe-allocation uint)
  (growth-allocation uint)
  (cash-allocation uint)
  (safe-module uint)
  (growth-module uint)
  (cash-module uint)
)
  (let (
      (total-allocation (+ (+ safe-allocation growth-allocation) cash-allocation))
      (strategy-id (var-get next-strategy-id))
    )
    (begin
      (asserts! (> total-allocation u0) ERR_BAD_ALLOCATION)
      (asserts! (is-eq total-allocation u100) ERR_BAD_ALLOCATION)
      (asserts! (is-supported-module safe-module) ERR_UNKNOWN_MODULE)
      (asserts! (is-supported-module growth-module) ERR_UNKNOWN_MODULE)
      (asserts! (is-supported-module cash-module) ERR_UNKNOWN_MODULE)
      (asserts! (not (is-eq safe-module growth-module)) ERR_DUPLICATE_MODULE)
      (asserts! (not (is-eq safe-module cash-module)) ERR_DUPLICATE_MODULE)
      (asserts! (not (is-eq growth-module cash-module)) ERR_DUPLICATE_MODULE)

      (map-set strategies strategy-id {
        owner: tx-sender,
        safe-allocation: safe-allocation,
        growth-allocation: growth-allocation,
        cash-allocation: cash-allocation,
        safe-module: safe-module,
        growth-module: growth-module,
        cash-module: cash-module,
        created-at: block-height
      })
      (map-set user-strategy tx-sender strategy-id)
      (var-set next-strategy-id (+ strategy-id u1))
      (record-event tx-sender strategy-id ACTION_CONFIGURE u999 u0 tx-sender)
      (print {
        event: "strategy-configured",
        user: tx-sender,
        strategy-id: strategy-id,
        safe-allocation: safe-allocation,
        growth-allocation: growth-allocation,
        cash-allocation: cash-allocation
      })
      (ok strategy-id)
    )
  )
)

(define-public (adopt-strategy (source-strategy-id uint))
  (let (
      (source (unwrap! (map-get? strategies source-strategy-id) ERR_STRATEGY_NOT_FOUND))
      (strategy-id (var-get next-strategy-id))
    )
    (begin
      (map-set strategies strategy-id {
        owner: tx-sender,
        safe-allocation: (get safe-allocation source),
        growth-allocation: (get growth-allocation source),
        cash-allocation: (get cash-allocation source),
        safe-module: (get safe-module source),
        growth-module: (get growth-module source),
        cash-module: (get cash-module source),
        created-at: block-height
      })
      (map-set user-strategy tx-sender strategy-id)
      (var-set next-strategy-id (+ strategy-id u1))
      (record-event tx-sender strategy-id ACTION_CONFIGURE u999 u0 tx-sender)
      (print {
        event: "strategy-adopted",
        user: tx-sender,
        strategy-id: strategy-id,
        source-strategy-id: source-strategy-id
      })
      (ok strategy-id)
    )
  )
)

(define-public (allow-payer (strategy-id uint) (payer principal))
  (begin
    (try! (only-strategy-owner strategy-id))
    (map-set whitelisted-payers { strategy-id: strategy-id, payer: payer } true)
    (record-event tx-sender strategy-id ACTION_ALLOW_PAYER u999 u0 payer)
    (print {
      event: "payer-allowed",
      strategy-id: strategy-id,
      owner: tx-sender,
      payer: payer
    })
    (ok true)
  )
)

(define-public (revoke-payer (strategy-id uint) (payer principal))
  (begin
    (try! (only-strategy-owner strategy-id))
    (map-delete whitelisted-payers { strategy-id: strategy-id, payer: payer })
    (record-event tx-sender strategy-id ACTION_REVOKE_PAYER u999 u0 payer)
    (print {
      event: "payer-revoked",
      strategy-id: strategy-id,
      owner: tx-sender,
      payer: payer
    })
    (ok true)
  )
)

(define-public (deposit (strategy-id uint) (amount uint))
  (let ((strategy (unwrap! (map-get? strategies strategy-id) ERR_STRATEGY_NOT_FOUND)))
    (begin
      (asserts! (> amount u0) ERR_INVALID_AMOUNT)
      (asserts! (is-allowed-payer strategy-id tx-sender (get owner strategy)) ERR_NOT_ALLOWED_PAYER)

      (let (
          (safe-amount (/ (* amount (get safe-allocation strategy)) u100))
          (growth-amount (/ (* amount (get growth-allocation strategy)) u100))
          (cash-amount (- amount (+ (/ (* amount (get safe-allocation strategy)) u100) (/ (* amount (get growth-allocation strategy)) u100))))
          (owner (get owner strategy))
        )
        (begin
          (try! (module-deposit (get safe-module strategy) owner safe-amount))
          (try! (module-deposit (get growth-module strategy) owner growth-amount))
          (try! (module-deposit (get cash-module strategy) owner cash-amount))

          (record-event owner strategy-id ACTION_DEPOSIT (get safe-module strategy) safe-amount tx-sender)
          (record-event owner strategy-id ACTION_DEPOSIT (get growth-module strategy) growth-amount tx-sender)
          (record-event owner strategy-id ACTION_DEPOSIT (get cash-module strategy) cash-amount tx-sender)

          (print {
            event: "deposit-split",
            strategy-id: strategy-id,
            beneficiary: owner,
            payer: tx-sender,
            total: amount,
            safe-amount: safe-amount,
            growth-amount: growth-amount,
            cash-amount: cash-amount
          })

          (ok {
            safe-amount: safe-amount,
            growth-amount: growth-amount,
            cash-amount: cash-amount
          })
        )
      )
    )
  )
)

(define-public (withdraw-from-strategy (module-id uint) (amount uint))
  (let (
      (strategy-id (unwrap! (map-get? user-strategy tx-sender) ERR_STRATEGY_NOT_FOUND))
      (strategy (unwrap! (map-get? strategies strategy-id) ERR_STRATEGY_NOT_FOUND))
    )
    (begin
      (asserts! (> amount u0) ERR_INVALID_AMOUNT)
      (asserts! (module-in-strategy module-id strategy) ERR_MODULE_NOT_IN_STRATEGY)
      (let ((withdrawn (try! (module-withdraw module-id tx-sender amount))))
        (begin
          (record-event tx-sender strategy-id ACTION_WITHDRAW module-id withdrawn tx-sender)
          (print {
            event: "withdrawn",
            user: tx-sender,
            strategy-id: strategy-id,
            module-id: module-id,
            amount: withdrawn
          })
          (ok withdrawn)
        )
      )
    )
  )
)

(define-read-only (get-strategy (strategy-id uint))
  (ok (map-get? strategies strategy-id))
)

(define-read-only (get-user-strategy (user principal))
  (match (map-get? user-strategy user)
    strategy-id
      (match (map-get? strategies strategy-id)
        strategy (ok (some (merge strategy { strategy-id: strategy-id })))
        (ok none)
      )
    (ok none)
  )
)

(define-read-only (get-user-positions (user principal))
  (match (map-get? user-strategy user)
    strategy-id
      (let (
          (strategy (unwrap! (map-get? strategies strategy-id) ERR_STRATEGY_NOT_FOUND))
          (safe-position (unwrap! (module-position (get safe-module strategy) user) ERR_UNKNOWN_MODULE))
          (growth-position (unwrap! (module-position (get growth-module strategy) user) ERR_UNKNOWN_MODULE))
          (cash-position (unwrap! (module-position (get cash-module strategy) user) ERR_UNKNOWN_MODULE))
        )
        (ok (some {
          strategy-id: strategy-id,
          safe-module: (get safe-module strategy),
          growth-module: (get growth-module strategy),
          cash-module: (get cash-module strategy),
          safe: safe-position,
          growth: growth-position,
          cash: cash-position,
          total: (+ (+ (get total safe-position) (get total growth-position)) (get total cash-position))
        }))
      )
    (ok none)
  )
)

(define-read-only (get-user-event-count (user principal))
  (ok (default-to u0 (map-get? user-event-count user)))
)

(define-read-only (get-user-event-id (user principal) (index uint))
  (ok (map-get? user-events { user: user, index: index }))
)

(define-read-only (get-event (event-id uint))
  (ok (map-get? events event-id))
)

(define-read-only (get-last-event-id)
  (let ((next-id (var-get next-event-id)))
    (if (> next-id u1)
      (ok (- next-id u1))
      (ok u0)
    )
  )
)

(define-read-only (get-supported-modules)
  (ok (list MODULE_SIMPLE_YIELD MODULE_STABLE MODULE_GROWTH))
)
