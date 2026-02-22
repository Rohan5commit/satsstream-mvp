(define-trait strategy-module-trait
  (
    (deposit (user principal) (amount uint) (response uint uint))
    (withdraw (user principal) (amount uint) (response uint uint))
    (get-position (user principal) (response (tuple (principal uint) (earned uint) (total uint)) uint))
  )
)
