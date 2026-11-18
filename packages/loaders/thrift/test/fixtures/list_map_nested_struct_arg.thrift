struct Item {
  1: i32 value
}

service ListMapNestedSvc {
  void putNested(1: list<map<string, list<Item>>> batches)
}
