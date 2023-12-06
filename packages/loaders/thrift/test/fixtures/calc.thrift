include "calc_types.thrift"

struct AddRequest {
    1: required calc_types.digit left;
    2: required calc_types.digit right;
}

service Calculator {
  calc_types.digit add(1: AddRequest request)
  calc_types.digit subtract(1: calc_types.digit left, 2: calc_types.digit right)
}
