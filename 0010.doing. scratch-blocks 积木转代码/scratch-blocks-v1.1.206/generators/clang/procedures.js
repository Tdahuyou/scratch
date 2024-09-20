/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for procedure blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Clang.procedures');

goog.require('Blockly.Clang');


Blockly.Clang['procedures_defreturn'] = function(block) {
  // Define a procedure with a return value.
  var funcName = Blockly.Clang.variableDB_.getName(
      block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
  var xfix1 = '';
  if (Blockly.Clang.STATEMENT_PREFIX) {
    xfix1 += Blockly.Clang.injectId(Blockly.Clang.STATEMENT_PREFIX,
        block);
  }
  if (Blockly.Clang.STATEMENT_SUFFIX) {
    xfix1 += Blockly.Clang.injectId(Blockly.Clang.STATEMENT_SUFFIX,
        block);
  }
  if (xfix1) {
    xfix1 = Blockly.Clang.prefixLines(xfix1, Blockly.Clang.INDENT);
  }
  var loopTrap = '';
  if (Blockly.Clang.INFINITE_LOOP_TRAP) {
    loopTrap = Blockly.Clang.prefixLines(
        Blockly.Clang.injectId(Blockly.Clang.INFINITE_LOOP_TRAP,
        block), Blockly.Clang.INDENT);
  }
  var branch = Blockly.Clang.statementToCode(block, 'STACK');
  var returnValue = Blockly.Clang.valueToCode(block, 'RETURN',
      Blockly.Clang.ORDER_NONE) || '';
  var xfix2 = '';
  if (branch && returnValue) {
    // After executing the function body, revisit this block for the return.
    xfix2 = xfix1;
  }
  if (returnValue) {
    returnValue = Blockly.Clang.INDENT + 'return ' + returnValue + ';\n';
  }
  var args = [];
  var variables = block.getVars();
  for (var i = 0; i < variables.length; i++) {
    args[i] = Blockly.Clang.variableDB_.getName(variables[i],
        Blockly.VARIABLE_CATEGORY_NAME);
  }
  var code = 'function ' + funcName + '(' + args.join(', ') + ') {\n' +
      xfix1 + loopTrap + branch + xfix2 + returnValue + '}';
  code = Blockly.Clang.scrub_(block, code);
  // Add % so as not to collide with helper functions in definitions list.
  Blockly.Clang.definitions_['%' + funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
Blockly.Clang['procedures_defnoreturn'] =
    Blockly.Clang['procedures_defreturn'];

Blockly.Clang['procedures_callreturn'] = function(block) {
  // Call a procedure with a return value.
  var funcName = Blockly.Clang.variableDB_.getName(
      block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
  var args = [];
  var variables = block.getVars();
  for (var i = 0; i < variables.length; i++) {
    args[i] = Blockly.Clang.valueToCode(block, 'ARG' + i,
        Blockly.Clang.ORDER_COMMA) || 'null';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['procedures_callnoreturn'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.
  var tuple = Blockly.Clang['procedures_callreturn'](block);
  return tuple[0] + ';\n';
};

Blockly.Clang['procedures_ifreturn'] = function(block) {
  // Conditionally return value from a procedure.
  var condition = Blockly.Clang.valueToCode(block, 'CONDITION',
      Blockly.Clang.ORDER_NONE) || 'false';
  var code = 'if (' + condition + ') {\n';
  if (Blockly.Clang.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the return is triggered.
    code += Blockly.Clang.prefixLines(
        Blockly.Clang.injectId(Blockly.Clang.STATEMENT_SUFFIX, block),
        Blockly.Clang.INDENT);
  }
  if (block.hasReturnValue_) {
    var value = Blockly.Clang.valueToCode(block, 'VALUE',
        Blockly.Clang.ORDER_NONE) || 'null';
    code += Blockly.Clang.INDENT + 'return ' + value + ';\n';
  } else {
    code += Blockly.Clang.INDENT + 'return;\n';
  }
  code += '}\n';
  return code;
};


//dev-procedures


Blockly.Clang['procedures_definition'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.
  var prototype_block = block.getInputTargetBlock('custom_block');

  var nextBlock = block.getNextBlock();
  var procName = Blockly.Clang.functionName(prototype_block.procCode_.split(' ')[0]);
  var params = prototype_block.displayNames_.map(p => Blockly.Clang.paramName(p));
  var line = '';

  if(nextBlock)
  {
    line = Blockly.Clang.blockToCode(nextBlock);
    if(Blockly.Clang.isArray(line))
    {
      line = line[0];
    }
    line = Blockly.Clang.prefixLines(line, Blockly.Clang.INDENT);
  }

  params = params.map(p => 'float ' + p);

  var code = 'void ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ + '(' + params.join(', ') + '){\n' + line + '}';

  Blockly.Clang.provideFunction_(procName, [code]);

  return '';
};

Blockly.Clang.BooleanValues = ['true', 'false'];

Blockly.Clang['procedures_call'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.

  var code = '';
  var procName = Blockly.Clang.functionName(block.procCode_.split(' ')[0]);
  var args = [];
  for (let i = 0; i < block.argumentIds_.length; i++) {
      var line = Blockly.Clang.valueToCode(block, block.argumentIds_[i],
      Blockly.Clang.ORDER_NONE);
      line = Blockly.Clang.trimQuote(line);

      if(!line)
      {
        line = (Blockly.Clang.BooleanValues.indexOf(line) != -1) ? line : '0';

      }
      args.push(line);
  }

  code = procName + '(' + args.join(', ') + ');';

  return code + '\n';
};


Blockly.Clang['argument_reporter_boolean'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.

  var code = Blockly.Clang.paramName(block.getFieldValue('VALUE'));

  return [code, Blockly.Clang.ORDER_ATOMIC];
};


Blockly.Clang['argument_reporter_string_number'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.

  var code = Blockly.Clang.paramName(block.getFieldValue('VALUE'));

  return [code, Blockly.Clang.ORDER_ATOMIC];
};



