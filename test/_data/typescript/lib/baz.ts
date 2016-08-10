import '../vm';
moduleLoaded('baz.ts');

import Bar from './bar';

export function baz(text:string) {
  moduleExecuted('baz.ts');
  let baz = new Bar(text);
  return baz.greet();
}
