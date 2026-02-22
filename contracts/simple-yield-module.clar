(define-constant ERR_UNAUTHORIZED (err u400))
(define-constant ERR_INSUFFICIENT_BALANCE (err u401))
(define-constant RATE_BPS_PER_BLOCK u2)

(define-data-var owner principal tx-sender)
(define-data-var router principal tx-sender)

(define-map positions principal (tuple (principal uint) (earned uint) (last-update uint)))

(define-public (set-router (new-router principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR_UNAUTHORIZED)
    (var-set router new-router)
    (ok true)
  )
)

(define-private (read-position (user principal))
  (default-to { principal: u0, earned: u0, last-update: block-height } (map-get? positions user))
)

(define-private (calculate-newly-earned (principal-amount uint) (last-update uint))
  (/ (* (* principal-amount (- block-height last-update)) RATE_BPS_PER_BLOCK) u10000)
)

(define-private (sync-position (user principal))
  (let (
      (current (read-position user))
      (newly-earned (calculate-newly-earned (get principal current) (get last-update current)))
      (synced {
        principal: (get principal current),
        earned: (+ (get earned current) newly-earned),
        last-update: block-height
      })
    )
    (begin
      (map-set positions user synced)
      synced
    )
  )
)

(define-public (deposit (user principal) (amount uint))
  (begin
    (asserts! (is-eq contract-caller (var-get router)) ERR_UNAUTHORIZED)
    (let (
        (synced (sync-position user))
        (updated {
          principal: (+ (get principal synced) amount),
          earned: (get earned synced),
          last-update: block-height
        })
      )
      (map-set positions user updated)
      (ok amount)
    )
  )
)

(define-public (withdraw (user principal) (amount uint))
  (begin
    (asserts! (is-eq contract-caller (var-get router)) ERR_UNAUTHORIZED)
    (let (
        (synced (sync-position user))
        (principal-now (get principal synced))
        (earned-now (get earned synced))
        (total-now (+ principal-now earned-now))
      )
      (asserts! (>= total-now amount) ERR_INSUFFICIENT_BALANCE)
      (let (
          (principal-used (if (>= principal-now amount) amount principal-now))
          (earned-used (- amount principal-used))
          (updated {
            principal: (- principal-now principal-used),
            earned: (- earned-now earned-used),
            last-update: block-height
          })
        )
        (map-set positions user updated)
        (ok amount)
      )
    )
  )
)

(define-read-only (get-position (user principal))
  (let (
      (current (read-position user))
      (newly-earned (calculate-newly-earned (get principal current) (get last-update current)))
      (principal-now (get principal current))
      (earned-now (+ (get earned current) newly-earned))
    )
    (ok {
      principal: principal-now,
      earned: earned-now,
      total: (+ principal-now earned-now)
    })
  )
)
