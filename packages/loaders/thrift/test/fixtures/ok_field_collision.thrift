exception OkBoom {
  1: bool ok
}

service OkCollisionSvc {
  void flush() throws (1: OkBoom boom)
}
