/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for logic blocks.
 * @author q.neutron@gmail.com (Quynh Neutron)
 */
'use strict';

goog.provide('Blockly.Clang.event');

goog.require('Blockly.Clang');


Blockly.Clang['event_when_wobot_started'] = function(block) {

  var line = '';

  return line;
  
};


Blockly.Clang['event_when_wobot_loop'] = function (block) {

  var nextBlock = block.getNextBlock();
  var line = null;

  if (nextBlock) {
    line = Blockly.Clang.blockToCode(nextBlock);
    if (Blockly.Clang.isArray(line)) {
      line = line[0];
    }

    if (!!line) {
      Blockly.Clang.loopEvent.push(line);

      console.log("event_when_wobot_loop ", line);
    }

  }

  return '';

};


