enum State {
  READY = 7
  BUSY = 8
}

service EnumReturn {
  State getState()
  list<State> listStates()
}
