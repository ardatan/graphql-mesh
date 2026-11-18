exception Boom {
  1: string message
}

struct Item {
  1: i32 left
  2: string text
}

service ListSetThrowsSvc {
  list<Item> items() throws (1: Boom boom)
  set<Item> uniqueItems() throws (1: Boom boom)
}
