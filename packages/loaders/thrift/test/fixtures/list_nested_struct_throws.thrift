exception Boom {
  1: string message
}

struct Child {
  1: i32 n
}

struct Item {
  1: i32 left
  2: list<Child> children
}

service ListNestedStructThrowsSvc {
  list<Item> items() throws (1: Boom boom)
}
