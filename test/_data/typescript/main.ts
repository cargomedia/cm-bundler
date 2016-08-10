import './vm';
moduleLoaded('main.ts');

import Foo from './lib/foo';
import Bar from './lib/bar';

let file1 = require('bar/file1');
file1();

let foo = new Foo('hello');
let bar = new Bar('hello');
addData('foo:' + foo.greet() + ' bar:' + bar.greet());
