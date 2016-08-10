import '../vm';
moduleLoaded('bar.ts');

import Foo from './foo';

export default class Bar extends Foo {

  greet():string {
    return super.greet().toUpperCase();
  }
}
