import '../vm';
moduleLoaded('foo.ts');

export default class Foo {

  constructor(public greeting:string) {
  }

  greet() {
    return this.greeting;
  }
}
