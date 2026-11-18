enum State {
  READY = 7
  BUSY = 8
}

service NestedEnumListSvc {
  void putStates(1: list<list<State>> batches)
}
