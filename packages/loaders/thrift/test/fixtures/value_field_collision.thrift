exception ValueBoom {
  1: string value
}

struct GoOk {
  1: i32 left
}

service ValueCollisionSvc {
  GoOk go() throws (1: ValueBoom boom)
}
