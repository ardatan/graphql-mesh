enum State {
  READY = 7
  BUSY = 8
}

struct StatusBag {
  1: list<State> states
  2: set<State> uniqueStates
}

exception Boom {
  1: string message
}

service EnumReturn {
  State getState()
  list<State> listStates()
  StatusBag getStatusBag()
  StatusBag getStatusBagOrThrow() throws (1: Boom boom)
}
