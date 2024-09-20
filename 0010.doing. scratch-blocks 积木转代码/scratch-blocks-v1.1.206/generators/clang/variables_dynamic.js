/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for dynamic variable blocks.
 * @author fenichel@google.com (Rachel Fenichel)
 */
'use strict';

goog.provide('Blockly.Clang.variablesDynamic');

goog.require('Blockly.Clang');
goog.require('Blockly.Clang.variables');


// JavaScript is dynamically typed.
Blockly.Clang['variables_get_dynamic'] =
    Blockly.Clang['variables_get'];
Blockly.Clang['variables_set_dynamic'] =
    Blockly.Clang['variables_set'];
