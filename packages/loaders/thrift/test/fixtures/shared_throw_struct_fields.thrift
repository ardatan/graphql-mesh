struct Detail {
  1: string text
  2: i32 code
}

exception First {
  1: Detail detail
}

exception Second {
  1: Detail detail
}

struct GoOk {
  1: i32 left
}

service SharedThrowStructSvc {
  GoOk go() throws (1: First first, 2: Second second)
}
