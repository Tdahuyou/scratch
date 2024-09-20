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

goog.provide('Blockly.Clang.control');

goog.require('Blockly.Clang');

Blockly.Clang['control_wait'] = function(block) {

  var code = '', branchCode, times;

  times = Blockly.Clang.valueToCode(block, 'DURATION',
    Blockly.Clang.ORDER_RELATIONAL) || '0';

  code += 'delay_sec(' + times + ');';

  return code + '\n';
};


Blockly.Clang['control_wait_m6'] = function(block) {

  var code = '', branchCode, times;

  times = Blockly.Clang.valueToCode(block, 'DURATION',
    Blockly.Clang.ORDER_RELATIONAL) || '0';

  code += 'wait(' + times + ');';

  return code + '\n';
};


Blockly.Clang['control_forever'] = function(block) {

  var code = '', branchCode;

  branchCode = Blockly.Clang.statementToCode(block, 'SUBSTACK') || '';

  code += 'while (true) {\n' + branchCode + '}';

  return code + '\n';
};

Blockly.Clang['control_repeat'] = function(block) {

  var code = '', branchCode, times;

  times = Blockly.Clang.valueToCode(block, 'TIMES',
    Blockly.Clang.ORDER_RELATIONAL) || '0';

  branchCode = Blockly.Clang.statementToCode(block, 'SUBSTACK') || '';

  code += 'for (int i = 0; i < ' + times + '; i++) {\n' + branchCode + '}';

  return code + '\n';
};

Blockly.Clang['control_if'] = function(block) {
  // If condition.
  var code = '', branchCode, conditionCode;
  if (Blockly.Clang.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    code += Blockly.Clang.injectId(Blockly.Clang.STATEMENT_PREFIX,
        block);
  }

  conditionCode = Blockly.Clang.valueToCode(block, 'CONDITION',
    Blockly.Clang.ORDER_NONE) || 'false';

  branchCode = Blockly.Clang.statementToCode(block, 'SUBSTACK');
  if (Blockly.Clang.STATEMENT_SUFFIX) {
    branchCode = Blockly.Clang.prefixLines(
      Blockly.Clang.injectId(Blockly.Clang.STATEMENT_SUFFIX,
        block), Blockly.Clang.INDENT) + branchCode;
  }
  code += 'if (' + conditionCode + ') {\n' + branchCode + '}';

  return code + '\n';
};

Blockly.Clang['control_if_else'] = function(block) {
  // If else condition.
  var code = '', branchCode, branchCode2, conditionCode;
  if (Blockly.Clang.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    code += Blockly.Clang.injectId(Blockly.Clang.STATEMENT_PREFIX,
        block);
  }

  conditionCode = Blockly.Clang.valueToCode(block, 'CONDITION',
    Blockly.Clang.ORDER_NONE) || 'false';

  branchCode = Blockly.Clang.statementToCode(block, 'SUBSTACK');
  if (Blockly.Clang.STATEMENT_SUFFIX) {
    branchCode = Blockly.Clang.prefixLines(
      Blockly.Clang.injectId(Blockly.Clang.STATEMENT_SUFFIX,
        block), Blockly.Clang.INDENT) + branchCode;
  }

  branchCode2 = Blockly.Clang.statementToCode(block, 'SUBSTACK2');
  if (Blockly.Clang.STATEMENT_SUFFIX) {
    branchCode2 = Blockly.Clang.prefixLines(
      Blockly.Clang.injectId(Blockly.Clang.STATEMENT_SUFFIX,
        block), Blockly.Clang.INDENT) + branchCode2;
  }

  code += 'if (' + conditionCode + ') {\n' + branchCode + '}\n' +
          'else{\n' + branchCode2 + '}';

  return code + '\n';
};

Blockly.Clang['control_wait_until'] = function(block) {

  var code = '', branchCode, conditionCode;

  conditionCode = Blockly.Clang.valueToCode(block, 'CONDITION',
    Blockly.Clang.ORDER_NONE) || 'true';

  code += 'while (! (' + conditionCode + ')) {\n}';

  return code + '\n';
};

Blockly.Clang['control_wait_until_m6'] = function(block) {

  var code = '', branchCode, conditionCode;

  conditionCode = Blockly.Clang.valueToCode(block, 'CONDITION',
    Blockly.Clang.ORDER_NONE) || 'true';

  code += 'while (! (' + conditionCode + ')) {\n}';

  return code + '\n';
};


Blockly.Clang['control_repeat_until'] = function(block) {

  var code = '', branchCode, conditionCode;

  conditionCode = Blockly.Clang.valueToCode(block, 'CONDITION',
    Blockly.Clang.ORDER_NONE) || 'true';

  branchCode = Blockly.Clang.statementToCode(block, 'SUBSTACK') || '';

  code += 'while (! (' + conditionCode + ')) {\n' + branchCode + '}';

  return code + '\n';
};


Blockly.Clang['control_while'] = function(block) {

  var code = '', branchCode, conditionCode;

  conditionCode = Blockly.Clang.valueToCode(block, 'CONDITION',
    Blockly.Clang.ORDER_NONE) || 'true';

  branchCode = Blockly.Clang.statementToCode(block, 'SUBSTACK') || '';

  code += 'while (' + times + ') {\n' + branchCode + '}';

  return code + '\n';
};
