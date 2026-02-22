(define-constant ERR_UNAUTHORIZED (err u410))
(define-constant ERR_INSUFFICIENT_BALANCE (err u411))

(define-data-var owner principal tx-sender)
(define-data-var router principal tx-sender)

(define-map positions principal uint)

(define-public (set-router (new-router principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR_UNAUTHORIZED)
    (var-set router new-router)
    (ok true)
  )
)

(define-public (deposit (user principal) (amount uint))
  (begin
    (asserts! (is-eq contract-caller (var-get router)) ERR_UNAUTHORIZED)
    (map-set positions user (+ (default-to u0 (map-get? positions user)) amount))
    (ok amount)
  )
)

(define-public (withdraw (user principal) (amount uint))
  (let ((current (default-to u0 (map-get? positions user))))
    (begin
      (asserts! (is-eq contract-caller (var-get router)) ERR_UNAUTHORIZED)
      (asserts! (>= current amount) ERR_INSUFFICIENT_BALANCE)
      (map-set positions user (- current amount))
      (ok amount)
    )
  )
)

(define-read-only (get-position (user principal))
  (let ((principal-now (default-to u0 (map-get? positions user))))
    (ok {
      principal: principal-now,
      earned: u0,
      total: principal-now
    })
  )
)
