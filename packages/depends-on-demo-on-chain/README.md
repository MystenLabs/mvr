# README

A basic way to externally resolve `app@org` packages via the `.move` registry.

The idea is that this package depends on the `../demo` package.

Run:

```
make -C ../../mvr-cli; rm -rf build; rm Move.lock; sui move build 
```

There's a symlink in this directory so you don't have to add the binary to your path
