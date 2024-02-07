struct AddRequest {
    1: required i32 left;
    2: required i32 right;    
}

service Calculator {
  i32 add(1: AddRequest request)
  i32 subtract(1: i32 left, 2: i32 right)
}
