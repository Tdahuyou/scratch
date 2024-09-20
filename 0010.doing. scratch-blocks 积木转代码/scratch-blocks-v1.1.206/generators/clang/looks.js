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

goog.provide('Blockly.Clang.looks');

goog.require('Blockly.Clang');


Blockly.Clang['looks_set_emotion'] = function(block) {

  var code = '';
  var emotionId = Blockly.Clang.valueToCode(block, 'EMOTION_ID', Blockly.Clang.ORDER_NONE) || '1';
  var Lport = block.getFieldValue('LEFT_PORT');
  var Rport = block.getFieldValue('RIGHT_PORT');

  code = 'set_emotion(' + emotionId + ', ' + Lport + ', ' + Rport + ');';

  return code + '\n';
};


Blockly.Clang['looks_off_emotion'] = function(block) {

  var code = '';
  var Lport = block.getFieldValue('LEFT_PORT');
  var Rport = block.getFieldValue('RIGHT_PORT');

  code = 'off_emotion(' + Lport + ', ' + Rport + ');';

  return code + '\n';
};

Blockly.Clang['looks_set_symbol'] = function(block) {

  var code = '';
  var symbolId = Blockly.Clang.valueToCode(block, 'SYMBOL', Blockly.Clang.ORDER_NONE) || '1';
  var port = block.getFieldValue('PORT');

  code = 'set_symbol(' + symbolId + ', ' + port + ');';

  return code + '\n';
};

Blockly.Clang['looks_custom_led_matrix'] = function(block) {

  var code = '';
  var matrix = block.getFieldValue('MATRIX');

  matrix = Blockly.Clang.matrixConvert(matrix);

  var port = block.getFieldValue('PORT');

  code = 'set_symbol_cust((LedMaritx){{' + matrix.join(',') + '}}, ' + port + ');';

  return code + '\n';
};


Blockly.Clang['looks_off_led_matrix'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');

  code = 'off_led_matrix(' + port + ');';

  return code + '\n';
};

Blockly.Clang['looks_set_digital_tube'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');
  var value = Blockly.Clang.valueToCode(block, 'VALUE',
  Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_digital_tube(' + port + ', ' + value + ');';

  return code + '\n';
};


Blockly.Clang['looks_clear_digital_tube'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');

  code = 'clear_digital_tube(' + port + ');';

  return code + '\n';
};



Blockly.Clang['looks_set_led_light_rgb'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');
  var r = Blockly.Clang.valueToCode(block, 'R',
  Blockly.Clang.ORDER_NONE) || '0';
  var g = Blockly.Clang.valueToCode(block, 'G',
  Blockly.Clang.ORDER_NONE) || '0';
  var b = Blockly.Clang.valueToCode(block, 'B',
  Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_led_light_rgb(' + port + ', ' + r + ', ' + g + ', ' + b  + ');';

  return code + '\n';
};


Blockly.Clang['looks_set_led_light_color'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');
  var colorId = block.getFieldValue('COLOR');

  code = 'set_led_light_color(' + port + ', ' + colorId  + ');';

  return code + '\n';
};


Blockly.Clang['looks_off_led_light'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');

  code = 'off_led_light(' + port + ');';

  return code + '\n';
};


Blockly.Clang['looks_integrated_led'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');

  var Id = block.getFieldValue('LED_ID');

  var r = Blockly.Clang.valueToCode(block, 'R',
  Blockly.Clang.ORDER_NONE) || '0';
  var g = Blockly.Clang.valueToCode(block, 'G',
  Blockly.Clang.ORDER_NONE) || '0';
  var b = Blockly.Clang.valueToCode(block, 'B',
  Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_rgb_led_module(' + port + ', ' + Id + ', ' + r + ', ' + g + ', ' + b  + ');';

  return code + '\n';
};

Blockly.Clang['looks_integrated_led_m6'] = Blockly.Clang['looks_integrated_led'];


Blockly.Clang['looks_led_strip'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');

  var Id = Blockly.Clang.valueToCode(block, 'LED_ID',
  Blockly.Clang.ORDER_NONE) || '1';

  var r = Blockly.Clang.valueToCode(block, 'R',
  Blockly.Clang.ORDER_NONE) || '0';
  var g = Blockly.Clang.valueToCode(block, 'G',
  Blockly.Clang.ORDER_NONE) || '0';
  var b = Blockly.Clang.valueToCode(block, 'B',
  Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_rgb_led_strip(' + port + ', ' + Id + ', ' + r + ', ' + g + ', ' + b  + ');';

  return code + '\n';
};

Blockly.Clang['looks_led_strip_m6'] = Blockly.Clang['looks_led_strip'];


Blockly.Clang['looks_beep'] = function(block) {

  var code = '';
  var pitch = block.getFieldValue('PITCH');

  var len = block.getFieldValue('LEN');

  code = 'beep_play(' + pitch + ', ' + len + ');';

  return code + '\n';
};



