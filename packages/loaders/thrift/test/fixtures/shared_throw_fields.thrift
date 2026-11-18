exception First {
  1: string message
}

exception Second {
  1: string message
}

service SharedThrowSvc {
  bool go() throws (1: First first, 2: Second second)
}
