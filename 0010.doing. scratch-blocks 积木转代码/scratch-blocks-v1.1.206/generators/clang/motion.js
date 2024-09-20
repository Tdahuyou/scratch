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

goog.provide('Blockly.Clang.motion');

goog.require('Blockly.Clang');


Blockly.Clang['motion_set_encoder_motor'] = function(block) {

  var code = '';
  var motorId = block.getFieldValue('MOTOR_ID');
  var port = block.getFieldValue('PORT');
  var power = Blockly.Clang.valueToCode(block, 'POWER',
      Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_encoder_motor(' + motorId + ', ' + port + ', ' + power + ');';

  return code + '\n';
};


Blockly.Clang['motion_set_dc_motor'] = function(block) {

  var code = '';
  var motorId = block.getFieldValue('MOTOR_ID');
  var port = block.getFieldValue('PORT');
  var power = Blockly.Clang.valueToCode(block, 'POWER',
      Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_dc_motor(' + motorId + ', ' + port + ', ' + power + ');';

  return code + '\n';
};

Blockly.Clang['motion_smart_servo_angle'] = function(block) {

  var code = '';
  var servoId = Blockly.Clang.valueToCode(block, 'SERVO_ID',
  Blockly.Clang.ORDER_NONE) || '1';
  var speed = Blockly.Clang.valueToCode(block, 'SPEED',
  Blockly.Clang.ORDER_NONE) || '0';
  var angle = Blockly.Clang.valueToCode(block, 'ANGLE',
      Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_smart_servo_angle(' + servoId + ', ' + speed + ', ' + angle + ');';

  return code + '\n';
};

Blockly.Clang['motion_smart_servo_angle_m6'] = Blockly.Clang['motion_smart_servo_angle']


Blockly.Clang['motion_smart_servo'] = function(block) {

  var code = '';
  var servoId = Blockly.Clang.valueToCode(block, 'SERVO_ID',
  Blockly.Clang.ORDER_NONE) || '1';
  var speed = Blockly.Clang.valueToCode(block, 'SPEED',
      Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_smart_servo(' + servoId + ', ' + speed + ');';

  return code + '\n';
};

Blockly.Clang['motion_smart_servo_m6'] = Blockly.Clang['motion_smart_servo']

Blockly.Clang['motion_set_smart_servo_id'] = function(block) {

  var code = '';
  var servoId = Blockly.Clang.valueToCode(block, 'SERVO_ID',
  Blockly.Clang.ORDER_NONE) || '1';
  var newId = Blockly.Clang.valueToCode(block, 'NEW_ID',
      Blockly.Clang.ORDER_NONE) || '1';

  code = 'set_smart_servo_id(' + servoId + ', ' + newId + ');';

  return code + '\n';
};

Blockly.Clang['motion_set_smart_servo_id_m6'] = Blockly.Clang['motion_set_smart_servo_id']

Blockly.Clang['motion_servo'] = function(block) {

  var code = '';
  var port = block.getFieldValue('SERVO_PORT');
  var speed = Blockly.Clang.valueToCode(block, 'SPEED',
  Blockly.Clang.ORDER_NONE) || '0';
  var angle = Blockly.Clang.valueToCode(block, 'ANGLE',
  Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_servo(' + port + ', ' + speed + ', ' + angle  + ');';

  return code + '\n';
};

Blockly.Clang['motion_servo_m6'] = Blockly.Clang['motion_servo'];


Blockly.Clang['motion_step_motor'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');
  var power = Blockly.Clang.valueToCode(block, 'POWER',
  Blockly.Clang.ORDER_NONE) || '0';
  var steps = Blockly.Clang.valueToCode(block, 'STEPS',
  Blockly.Clang.ORDER_NONE) || '0';

  code = 'set_step_motor(' + port + ', ' + power + ', ' + steps  + ');';

  var loop_code = 'step_motor_loop(' + port + ');';

  Blockly.Clang.buildinLoop[loop_code] = 0;

  console.log("motion_step_motor ", loop_code);

  return code + '\n';
};



Blockly.Clang['motion_set_electromagnet'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');
  var status = block.getFieldValue('STATUS');

  code = 'set_electromagnet(' + port + ', ' + status  + ');';

  return code + '\n';
};


Blockly.Clang['motion_set_digital_output'] = function(block) {

  var code = '';
  var port = block.getFieldValue('PORT');
  var status = block.getFieldValue('STATUS');

  code = 'set_digital_output(' + port + ', ' + status  + ');';

  return code + '\n';
};

Blockly.Clang['motion_set_digital_output_m6'] = Blockly.Clang['motion_set_digital_output'];


