struct AddRequest {
    1: required i32 left;
    2: required i32 right;
}

exception CalcError {
    1: string message;
}

service Calculator {
  /** Add left and right from the request struct. */
  i32 add(1: AddRequest request)
  i32 subtract(1: i32 left, 2: i32 right)
  /** Divide left by right; throws when right is zero. */
  i32 divide(1: i32 left, 2: i32 right) throws (1: CalcError error)
  oneway void zip()
}
