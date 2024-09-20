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

goog.provide('Blockly.Clang.sensing');

goog.require('Blockly.Clang');


Blockly.Clang['sensing_gray_detected_line'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var port = block.getFieldValue('PORT');
    var line_type = block.getFieldValue('LINE');
    var code;

    code = 'gray_detected_line( ' + port + ', ' + line_type + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];

};

Blockly.Clang.sensing.simple_port_func = function (funcName) {
    var func = function (block) {
        var code = '';
        var port = block.getFieldValue('PORT');

        code = funcName + '(' + port + ')';

        return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    };

    return func;
};


Blockly.Clang['sensing_gray_value'] = Blockly.Clang.sensing.simple_port_func('gray_value');

Blockly.Clang['sensing_integrated_gray_value'] = Blockly.Clang.sensing.simple_port_func('integrated_gray_value');

Blockly.Clang['sensing_integrated_gray_value_v2'] = Blockly.Clang.sensing.simple_port_func('integrated_gray_value');

Blockly.Clang['sensing_flame_value'] = Blockly.Clang.sensing.simple_port_func('flame_value');

Blockly.Clang['sensing_temperature_value'] = Blockly.Clang.sensing.simple_port_func('temperature_value');

Blockly.Clang['sensing_humidity_value'] = Blockly.Clang.sensing.simple_port_func('humidity_value');

Blockly.Clang['sensing_volume_value'] = Blockly.Clang.sensing.simple_port_func('volume_value');

Blockly.Clang['sensing_ambient_light_value']
    = Blockly.Clang.sensing.simple_port_func('ambient_light_value');

Blockly.Clang['sensing_ultrasonic_detection_distance']
    = Blockly.Clang.sensing.simple_port_func('ultrasonic_detection_distance');

Blockly.Clang['sensing_gas_pressure']
    = Blockly.Clang.sensing.simple_port_func('gas_pressure');

Blockly.Clang['sensing_infrared_receiver']
    = Blockly.Clang.sensing.simple_port_func('infrared_receiver');

Blockly.Clang['sensing_infrared_receiver_m6']
    = Blockly.Clang['sensing_infrared_receiver'];

Blockly.Clang['sensing_infrared']
    = Blockly.Clang.sensing.simple_port_func('infrared_value');

Blockly.Clang['sensing_infrared_human']
    = Blockly.Clang.sensing.simple_port_func('human_infrared_value');

Blockly.Clang['sensing_potentiometer']
    = Blockly.Clang.sensing.simple_port_func('potentiometer');

Blockly.Clang['sensing_bluetooth_receiver'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var code;

    code = 'bluetooth_receiver()';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['sensing_bluetooth_stick'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var key = block.getFieldValue('KEY');
    var code;

    code = 'bluetooth_stick(' + key + ')';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['sensing_jointed_arm'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var port = block.getFieldValue('PORT');
    var axis = block.getFieldValue('AXIS');
    var code;

    code = 'jointed_arm( ' + port + ', ' + axis + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};


Blockly.Clang['sensing_touch_button'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var port = block.getFieldValue('PORT');
    var code;

    code = 'touch_button( ' + port + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['sensing_touch_switch']
    = Blockly.Clang['sensing_touch_button'];

Blockly.Clang['sensing_key_button'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var port = block.getFieldValue('PORT');
    var key = block.getFieldValue('KEY');
    var code;

    code = 'key_button( ' + port + ', ' + key + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['sensing_gyroscope'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var port = block.getFieldValue('PORT');
    var axis = block.getFieldValue('AXIS');
    var code;

    code = 'gyroscope( ' + port + ', ' + axis + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['sensing_limit_switch']
    = Blockly.Clang.sensing.simple_port_func('limit_switch');

Blockly.Clang['sensing_water_temperature']
    = Blockly.Clang.sensing.simple_port_func('water_temperature');

Blockly.Clang['sensing_analog_input']
    = Blockly.Clang.sensing.simple_port_func('analog_input');

Blockly.Clang['sensing_analog_input_m6']
    = Blockly.Clang['sensing_analog_input'];

Blockly.Clang['sensing_timer_value'] = function (block) {

    var code;

    code = 'time_value()';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['sensing_reset_timer'] = function (block) {

    var code;

    code = 'reset_time_value();\n';
    return code;
};

Blockly.Clang['sensing_ai_face_value'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var model1 = Blockly.Clang.valueToCode(block, 'MODEL_1',
    Blockly.Clang.ORDER_NONE) || '0';

    var model2 = Blockly.Clang.valueToCode(block, 'MODEL_2',
    Blockly.Clang.ORDER_NONE) || '0';
    var code;

    code = 'ai_face_value( ' + model1 + ', ' + model2 + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['sensing_ai_face_num'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var model1 = Blockly.Clang.valueToCode(block, 'MODEL_ID',
    Blockly.Clang.ORDER_NONE) || '0';
    var code;

    code = 'ai_face_count( ' + model1 + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['sensing_ai_product_value'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;

    var model1 = Blockly.Clang.valueToCode(block, 'MODEL_1',
    Blockly.Clang.ORDER_NONE) || '0';

    var model2 = Blockly.Clang.valueToCode(block, 'MODEL_2',
    Blockly.Clang.ORDER_NONE) || '0';
    var code;

    code = 'ai_product_value( ' + model1 + ', ' + model2 + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};
