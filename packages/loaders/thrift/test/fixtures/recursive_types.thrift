struct Foo {
  1: optional string name;
  2: optional Foo foo;
}

service Recursive {
  Foo bar(1: Foo foo)
}
