struct Item {
  7: i32 value
}

service ListMapSvc {
  void putBatches(1: list<map<string, Item>> batches)
}
