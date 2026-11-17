exception Boom {
  1: string message;
}

service VoidThrows {
  void flush() throws (1: Boom boom)
}
