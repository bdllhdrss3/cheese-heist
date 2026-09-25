import {makeScene2D} from '@revideo/2d';
import {makeProject, useScene} from '@revideo/core';
import {shot1} from './scenes/shot1';
import {shot2} from './scenes/shot2';
import {shot3} from './scenes/shot3';
import {shot4} from './scenes/shot4';
import {shot5} from './scenes/shot5';
import {shot6} from './scenes/shot6';
import {shot7} from './scenes/shot7';
import {buildStage} from './scenes/stage';
import type {Orientation} from './scenes/stage';

const cartoon = makeScene2D('cheese-heist', function* (view) {
  const orientation = useScene().variables.get<Orientation>('orientation', 'landscape')();
  view.fill('#000');
  const s = buildStage(view, orientation);
  yield* shot1(s);
  yield* shot2(s);
  yield* shot3(s);
  yield* shot4(s);
  yield* shot5(s);
  yield* shot6(s);
  yield* shot7(s);
});

export default makeProject({
  scenes: [cartoon],
  variables: {orientation: 'landscape'},
  settings: {
    shared: {size: {x: 1920, y: 1080}, background: '#000000'},
    rendering: {fps: 24},
    preview: {fps: 24},
  },
});
