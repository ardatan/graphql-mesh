struct Item {
  7: i32 value
}

service StructMapService {
  void putItems(1: map<string, Item> items)
}
