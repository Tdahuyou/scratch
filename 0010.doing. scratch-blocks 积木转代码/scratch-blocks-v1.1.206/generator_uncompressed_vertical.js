
/**
 * @fileoverview Helper functions for generating JavaScript for blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Clang');

goog.require('Blockly.Generator');
// goog.require('Blockly.utils.global');
// goog.require('Blockly.utils.string');


/**
 * Clang code generator.
 * @type {!Blockly.Generator}
 */
Blockly.Clang = new Blockly.Generator('Clang');

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.Clang.addReservedWords(
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Keywords
    'break,case,catch,class,const,continue,debugger,default,delete,do,else,export,extends,finally,for,function,if,import,in,instanceof,new,return,super,switch,this,throw,try,typeof,var,void,while,with,yield,' +
    'enum,' +
    'implements,interface,let,package,private,protected,public,static,' +
    'await,' +
    'null,true,false,' +
    // Magic variable.
    'arguments,' /*+
    // Everything in the current environment (835 items in Chrome, 104 in Node).
    Object.getOwnPropertyNames(Blockly.utils.global).join(',')
    */
    );

/**
 * Order of operation ENUMs.
 * https://developer.mozilla.org/en/JavaScript/Reference/Operators/Operator_Precedence
 */
Blockly.Clang.ORDER_ATOMIC = 0;           // 0 "" ...
Blockly.Clang.ORDER_NEW = 1.1;            // new
Blockly.Clang.ORDER_MEMBER = 1.2;         // . []
Blockly.Clang.ORDER_FUNCTION_CALL = 2;    // ()
Blockly.Clang.ORDER_INCREMENT = 3;        // ++
Blockly.Clang.ORDER_DECREMENT = 3;        // --
Blockly.Clang.ORDER_BITWISE_NOT = 4.1;    // ~
Blockly.Clang.ORDER_UNARY_PLUS = 4.2;     // +
Blockly.Clang.ORDER_UNARY_NEGATION = 4.3; // -
Blockly.Clang.ORDER_LOGICAL_NOT = 4.4;    // !
Blockly.Clang.ORDER_TYPEOF = 4.5;         // typeof
Blockly.Clang.ORDER_VOID = 4.6;           // void
Blockly.Clang.ORDER_DELETE = 4.7;         // delete
Blockly.Clang.ORDER_AWAIT = 4.8;          // await
Blockly.Clang.ORDER_EXPONENTIATION = 5.0; // **
Blockly.Clang.ORDER_MULTIPLICATION = 5.1; // *
Blockly.Clang.ORDER_DIVISION = 5.2;       // /
Blockly.Clang.ORDER_MODULUS = 5.3;        // %
Blockly.Clang.ORDER_SUBTRACTION = 6.1;    // -
Blockly.Clang.ORDER_ADDITION = 6.2;       // +
Blockly.Clang.ORDER_BITWISE_SHIFT = 7;    // << >> >>>
Blockly.Clang.ORDER_RELATIONAL = 8;       // < <= > >=
Blockly.Clang.ORDER_IN = 8;               // in
Blockly.Clang.ORDER_INSTANCEOF = 8;       // instanceof
Blockly.Clang.ORDER_EQUALITY = 9;         // == != === !==
Blockly.Clang.ORDER_BITWISE_AND = 10;     // &
Blockly.Clang.ORDER_BITWISE_XOR = 11;     // ^
Blockly.Clang.ORDER_BITWISE_OR = 12;      // |
Blockly.Clang.ORDER_LOGICAL_AND = 13;     // &&
Blockly.Clang.ORDER_LOGICAL_OR = 14;      // ||
Blockly.Clang.ORDER_CONDITIONAL = 15;     // ?:
Blockly.Clang.ORDER_ASSIGNMENT = 16;      // = += -= **= *= /= %= <<= >>= ...
Blockly.Clang.ORDER_YIELD = 17;           // yield
Blockly.Clang.ORDER_COMMA = 18;           // ,
Blockly.Clang.ORDER_NONE = 99;            // (...)

/**
 * List of outer-inner pairings that do NOT require parentheses.
 * @type {!Array.<!Array.<number>>}
 */
Blockly.Clang.ORDER_OVERRIDES = [
  // (foo()).bar -> foo().bar
  // (foo())[0] -> foo()[0]
  [Blockly.Clang.ORDER_FUNCTION_CALL, Blockly.Clang.ORDER_MEMBER],
  // (foo())() -> foo()()
  [Blockly.Clang.ORDER_FUNCTION_CALL, Blockly.Clang.ORDER_FUNCTION_CALL],
  // (foo.bar).baz -> foo.bar.baz
  // (foo.bar)[0] -> foo.bar[0]
  // (foo[0]).bar -> foo[0].bar
  // (foo[0])[1] -> foo[0][1]
  [Blockly.Clang.ORDER_MEMBER, Blockly.Clang.ORDER_MEMBER],
  // (foo.bar)() -> foo.bar()
  // (foo[0])() -> foo[0]()
  [Blockly.Clang.ORDER_MEMBER, Blockly.Clang.ORDER_FUNCTION_CALL],

  // !(!foo) -> !!foo
  [Blockly.Clang.ORDER_LOGICAL_NOT, Blockly.Clang.ORDER_LOGICAL_NOT],
  // a * (b * c) -> a * b * c
  [Blockly.Clang.ORDER_MULTIPLICATION, Blockly.Clang.ORDER_MULTIPLICATION],
  // a + (b + c) -> a + b + c
  [Blockly.Clang.ORDER_ADDITION, Blockly.Clang.ORDER_ADDITION],
  // a && (b && c) -> a && b && c
  [Blockly.Clang.ORDER_LOGICAL_AND, Blockly.Clang.ORDER_LOGICAL_AND],
  // a || (b || c) -> a || b || c
  [Blockly.Clang.ORDER_LOGICAL_OR, Blockly.Clang.ORDER_LOGICAL_OR]
];

/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
Blockly.Clang.init = function(workspace) {
  // Create a dictionary of definitions to be printed before the code.
  Blockly.Clang.definitions_ = Object.create(null);
  // Create a dictionary mapping desired function names in definitions_
  // to actual function names (to avoid collisions with user functions).
  Blockly.Clang.functionNames_ = Object.create(null);

  if (!Blockly.Clang.variableDB_) {
    Blockly.Clang.variableDB_ =
        new Blockly.Names(Blockly.Clang.RESERVED_WORDS_);
  } else {
    Blockly.Clang.variableDB_.reset();
  }

  Blockly.Clang.variableDB_.setVariableMap(workspace.getVariableMap());

  Blockly.Clang.loopEvent = [];

  Blockly.Clang.buildinLoop = Object.create(null);

  var defvars = [];
  // Add developer variables (not created or named by the user).
  var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
  for (var i = 0; i < devVarList.length; i++) {
    defvars.push(Blockly.Clang.variableDB_.getName(devVarList[i],
        Blockly.Names.DEVELOPER_VARIABLE_TYPE));
  }

  // Add user variables, but only ones that are being used.
  var variables = Blockly.Variables.allUsedVarModels(workspace);
  for (var i = 0; i < variables.length; i++) {
    defvars.push(Blockly.Clang.variableDB_.getName(variables[i].getId(),
        Blockly.VARIABLE_CATEGORY_NAME));
  }

  // Declare all of the variables.
  if (defvars.length) {
    Blockly.Clang.definitions_['variables'] =
        'float ' + defvars.join(' = 0.0, ') + ' = 0.0;';
  }
};

/**
 * Generate code for all blocks in the workspace to Clang.
 * @param {Blockly.Workspace} workspace Workspace to generate code from.
 * @return {string} Generated code.
 */
Blockly.Clang.workspaceToCode = function(workspace, deviceType) {
  if (!workspace) {
    // Backwards compatibility from before there could be multiple workspaces.
    console.warn('No workspace specified in workspaceToCode call.  Guessing.');
    workspace = Blockly.getMainWorkspace();
  }

  var code = [];
  this.init(workspace);
  var blocks = workspace.getTopBlocks(true);
  var procedures = blocks.filter((b) => {
    // console.info("type", b.type);
    return b.type == 'procedures_definition';
  });

  var eventBlocks = blocks.filter((b) => {
    return b.type == 'event_when_wobot_started';
  });

  var loopBlocks = blocks.filter((b) => {
    return b.type == 'event_when_wobot_loop';
  });

  for (var x = 0, block; block = procedures[x]; x++) {
    this.blockToCode(block, true);
  }

  for (var x = 0, block; block = loopBlocks[x]; x++) {
    this.blockToCode(block, true);
  }

  for (var x = 0, block; block = eventBlocks[x]; x++) {
    var line = this.blockToCode(block);
    if (this.isArray(line)) {
      // Value blocks return tuples of code and operator order.
      // Top-level blocks don't care about operator order.
      line = line[0];
    }
    if (line) {
      if (block.outputConnection && this.scrubNakedValue) {
        // This block is a naked value.  Ask the language's code generator if
        // it wants to append a semicolon, or something.
        line = this.scrubNakedValue(line);
      }
      code.push(line);
    }
  }
  code = code.join('\n');  // Blank line between each section.
  code = this.finish(code, deviceType);
  // Final scrubbing of whitespace.
  code = code.replace(/^\s+\n/, '');
  code = code.replace(/\n\s+$/, '\n');
  code = code.replace(/[ \t]+\n/g, '\n');
  return code;
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.Clang.finish = function(code, deviceType) {
  // Convert the definitions dictionary into a list.
  var definitions = [];
  for (var name in Blockly.Clang.definitions_) {
    definitions.push(Blockly.Clang.definitions_[name]);
  }

  // Clean up temporary data.
  delete Blockly.Clang.definitions_;
  delete Blockly.Clang.functionNames_;
  Blockly.Clang.variableDB_.reset();

  code = Blockly.Clang.prefixLines(code, Blockly.Clang.INDENT);

  if (deviceType == 'WOBOT_M6') {
    code = 'void user_main(){\n' + code + '\n}';

    let includes = ['#include "whalesbot.h"'];

    code = includes.join('\n') + '\n'
    + definitions.join('\n\n')
    + '\n' + code + '\n';

  } else {

    code = 'void _setup(){\n' + code + '\n}';

    let includes = ['#include "whalesbot.h"'];

    let defaultFunc = ['void setup() {',
                        '  board_init();',
                        '}'];

    let loop = Blockly.Clang.loopCode();

    code = includes.join('\n') + '\n\n' + defaultFunc.join('\n')
    + '\n\n' + definitions.join('\n\n')
    + '\n\n\n' + code + '\n\n\n' + loop;
  }

  return code;
};

Blockly.Clang.loopCode = function() {
  let code = [];


  for (const key in Blockly.Clang.buildinLoop) {
    //if (Blockly.Clang.buildinLoop.hasOwnProperty(key)) {
      code.push(key);
    //}
  }

  code.push('\n');

  for (let index = 0; index < Blockly.Clang.loopEvent.length; index++) {
    const evt = Blockly.Clang.loopEvent[index];

    if(typeof evt == 'string'){
      code.push(evt);
    }
    else{
      code = code.concat(evt);
    }
  }

  code =  Blockly.Clang.prefixLines(code.join('\n') , Blockly.Clang.INDENT);

  code = 'void _loop(){\n' + code + '\n}';

  return code;
}

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  A trailing semicolon is needed to make this legal.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.Clang.scrubNakedValue = function(line) {
  return line + ';\n';
};

/**
 * Encode a string as a properly escaped JavaScript string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} JavaScript string.
 * @private
 */
Blockly.Clang.quote_ = function(string) {
  // Can't use goog.string.quote since Google's style guide recommends
  // JS string literals use single quotes.
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/'/g, '\\\'');
  return '\'' + string + '\'';
};
/**
 * trim quotation
 * quotes.
 * @param {string} string.
 * @return {string} string.
 */
Blockly.Clang.trimQuote = function (string) {

  if (string) {
    if (string.charAt(0) == '\'' && string.charAt(string.length - 1) == '\'') {
      string = string.substr(1, string.length - 2);
    }
    else if (string.charAt(0) == '"' && string.charAt(string.length - 1) == '"') {
      string = string.substr(1, string.length - 2);
    }
  }

  return string;
};

/**
 * Encode a string as a properly escaped multiline JavaScript string, complete
 * with quotes.
 * @param {string} string Text to encode.
 * @return {string} JavaScript string.
 * @private
 */
Blockly.Clang.multiline_quote_ = function(string) {
  // Can't use goog.string.quote since Google's style guide recommends
  // JS string literals use single quotes.
  var lines = string.split(/\n/g).map(Blockly.Clang.quote_);
  return lines.join(' + \'\\n\' +\n');
};

/**
 * Common tasks for generating JavaScript from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The JavaScript code created for this block.
 * @param {boolean=} opt_thisOnly True to generate code for only this statement.
 * @return {string} JavaScript code with comments and subsequent blocks added.
 * @private
 */
Blockly.Clang.scrub_ = function(block, code, opt_thisOnly) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {

      comment = Blockly.utils.string.wrap(comment,
          Blockly.Clang.COMMENT_WRAP - 3);
      commentCode += Blockly.Clang.prefixLines(comment + '\n', '// ');
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var i = 0; i < block.inputList.length; i++) {
      if (block.inputList[i].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[i].connection.targetBlock();
        if (childBlock) {
          comment = Blockly.Clang.allNestedComments(childBlock);
          if (comment) {
            commentCode += Blockly.Clang.prefixLines(comment, '// ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = opt_thisOnly ? '' : Blockly.Clang.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};

/**
 * Gets a property and adjusts the value while taking into account indexing.
 * @param {!Blockly.Block} block The block.
 * @param {string} atId The property ID of the element to get.
 * @param {number=} opt_delta Value to add.
 * @param {boolean=} opt_negate Whether to negate the value.
 * @param {number=} opt_order The highest order acting on this value.
 * @return {string|number}
 */
Blockly.Clang.getAdjusted = function(block, atId, opt_delta, opt_negate,
    opt_order) {
  var delta = opt_delta || 0;
  var order = opt_order || Blockly.Clang.ORDER_NONE;
  if (block.workspace.options.oneBasedIndex) {
    delta--;
  }
  var defaultAtIndex = block.workspace.options.oneBasedIndex ? '1' : '0';
  if (delta > 0) {
    var at = Blockly.Clang.valueToCode(block, atId,
        Blockly.Clang.ORDER_ADDITION) || defaultAtIndex;
  } else if (delta < 0) {
    var at = Blockly.Clang.valueToCode(block, atId,
        Blockly.Clang.ORDER_SUBTRACTION) || defaultAtIndex;
  } else if (opt_negate) {
    var at = Blockly.Clang.valueToCode(block, atId,
        Blockly.Clang.ORDER_UNARY_NEGATION) || defaultAtIndex;
  } else {
    var at = Blockly.Clang.valueToCode(block, atId, order) ||
        defaultAtIndex;
  }

  if (Blockly.isNumber(at)) {
    // If the index is a naked number, adjust it right now.
    at = Number(at) + delta;
    if (opt_negate) {
      at = -at;
    }
  } else {
    // If the index is dynamic, adjust it in code.
    if (delta > 0) {
      at = at + ' + ' + delta;
      var innerOrder = Blockly.Clang.ORDER_ADDITION;
    } else if (delta < 0) {
      at = at + ' - ' + -delta;
      var innerOrder = Blockly.Clang.ORDER_SUBTRACTION;
    }
    if (opt_negate) {
      if (delta) {
        at = '-(' + at + ')';
      } else {
        at = '-' + at;
      }
      var innerOrder = Blockly.Clang.ORDER_UNARY_NEGATION;
    }
    innerOrder = Math.floor(innerOrder);
    order = Math.floor(order);
    if (innerOrder && order >= innerOrder) {
      at = '(' + at + ')';
    }
  }
  return at;
};

Blockly.Clang.identifier = function (name, prefix = '') {
  if (!name) {
    name = '';
  }

  // Unfortunately names in non-latin characters will look like
  // _E9_9F_B3_E4_B9_90 which is pretty meaningless.
  // https://github.com/google/blockly/issues/1654
  name = encodeURI(name.replace(/ /g, '_')).replace(/[^\w]/g, '_');

  return prefix + name;
};

Blockly.Clang.functionName = function(name) {
  return Blockly.Clang.identifier(name,'func_');
}

Blockly.Clang.paramName = function(name) {
  return Blockly.Clang.identifier(name,'p_');
}

Blockly.Clang.matrixConvert = function(matrix) {
  if(!matrix || typeof matrix != 'string')
  {
    matrix = '';
  }
  while(matrix.length < 64){
    matrix += '0';
  }

  let rows = [];
  let from = 0;
  while(from < 64)
  {
    rows.push(matrix.substr(from, 8));
    from += 8;
  }

  let rets = [];
  let mask = 1;
  let val = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    val = 0;
    mask = 1;
    for (let col = row.length - 1; col >= 0; col--) {
      val = val | (row[col] == '0' ? 0 : mask);
      mask *= 2;
    }
    rets.push(val);
  }

  return rets;
}


/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for colour blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Clang.colour');

goog.require('Blockly.Clang');


Blockly.Clang['colour_picker'] = function(block) {
  // Colour picker.
  var code = Blockly.Clang.quote_(block.getFieldValue('COLOUR'));
  return [code, Blockly.Clang.ORDER_ATOMIC];
};

Blockly.Clang['colour_random'] = function(block) {
  // Generate a random colour.
  var functionName = Blockly.Clang.provideFunction_(
      'colourRandom',
      ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ + '() {',
        '  var num = Math.floor(Math.random() * Math.pow(2, 24));',
        '  return \'#\' + (\'00000\' + num.toString(16)).substr(-6);',
        '}']);
  var code = functionName + '()';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['colour_rgb'] = function(block) {
  // Compose a colour from RGB components expressed as percentages.
  var red = Blockly.Clang.valueToCode(block, 'RED',
      Blockly.Clang.ORDER_COMMA) || 0;
  var green = Blockly.Clang.valueToCode(block, 'GREEN',
      Blockly.Clang.ORDER_COMMA) || 0;
  var blue = Blockly.Clang.valueToCode(block, 'BLUE',
      Blockly.Clang.ORDER_COMMA) || 0;
  var functionName = Blockly.Clang.provideFunction_(
      'colourRgb',
      ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
          '(r, g, b) {',
       '  r = Math.max(Math.min(Number(r), 100), 0) * 2.55;',
       '  g = Math.max(Math.min(Number(g), 100), 0) * 2.55;',
       '  b = Math.max(Math.min(Number(b), 100), 0) * 2.55;',
       '  r = (\'0\' + (Math.round(r) || 0).toString(16)).slice(-2);',
       '  g = (\'0\' + (Math.round(g) || 0).toString(16)).slice(-2);',
       '  b = (\'0\' + (Math.round(b) || 0).toString(16)).slice(-2);',
       '  return \'#\' + r + g + b;',
       '}']);
  var code = functionName + '(' + red + ', ' + green + ', ' + blue + ')';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['colour_blend'] = function(block) {
  // Blend two colours together.
  var c1 = Blockly.Clang.valueToCode(block, 'COLOUR1',
      Blockly.Clang.ORDER_COMMA) || '\'#000000\'';
  var c2 = Blockly.Clang.valueToCode(block, 'COLOUR2',
      Blockly.Clang.ORDER_COMMA) || '\'#000000\'';
  var ratio = Blockly.Clang.valueToCode(block, 'RATIO',
      Blockly.Clang.ORDER_COMMA) || 0.5;
  var functionName = Blockly.Clang.provideFunction_(
      'colourBlend',
      ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
          '(c1, c2, ratio) {',
       '  ratio = Math.max(Math.min(Number(ratio), 1), 0);',
       '  var r1 = parseInt(c1.substring(1, 3), 16);',
       '  var g1 = parseInt(c1.substring(3, 5), 16);',
       '  var b1 = parseInt(c1.substring(5, 7), 16);',
       '  var r2 = parseInt(c2.substring(1, 3), 16);',
       '  var g2 = parseInt(c2.substring(3, 5), 16);',
       '  var b2 = parseInt(c2.substring(5, 7), 16);',
       '  var r = Math.round(r1 * (1 - ratio) + r2 * ratio);',
       '  var g = Math.round(g1 * (1 - ratio) + g2 * ratio);',
       '  var b = Math.round(b1 * (1 - ratio) + b2 * ratio);',
       '  r = (\'0\' + (r || 0).toString(16)).slice(-2);',
       '  g = (\'0\' + (g || 0).toString(16)).slice(-2);',
       '  b = (\'0\' + (b || 0).toString(16)).slice(-2);',
       '  return \'#\' + r + g + b;',
       '}']);
  var code = functionName + '(' + c1 + ', ' + c2 + ', ' + ratio + ')';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

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



/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for list blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Clang.lists');

goog.require('Blockly.Clang');


Blockly.Clang['lists_create_empty'] = function(block) {
  // Create an empty list.
  return ['[]', Blockly.Clang.ORDER_ATOMIC];
};

Blockly.Clang['lists_create_with'] = function(block) {
  // Create a list with any number of elements of any type.
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] = Blockly.Clang.valueToCode(block, 'ADD' + i,
        Blockly.Clang.ORDER_COMMA) || 'null';
  }
  var code = '[' + elements.join(', ') + ']';
  return [code, Blockly.Clang.ORDER_ATOMIC];
};

Blockly.Clang['lists_repeat'] = function(block) {
  // Create a list with one element repeated.
  var functionName = Blockly.Clang.provideFunction_(
      'listsRepeat',
      ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
          '(value, n) {',
       '  var array = [];',
       '  for (var i = 0; i < n; i++) {',
       '    array[i] = value;',
       '  }',
       '  return array;',
       '}']);
  var element = Blockly.Clang.valueToCode(block, 'ITEM',
      Blockly.Clang.ORDER_COMMA) || 'null';
  var repeatCount = Blockly.Clang.valueToCode(block, 'NUM',
      Blockly.Clang.ORDER_COMMA) || '0';
  var code = functionName + '(' + element + ', ' + repeatCount + ')';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['lists_length'] = function(block) {
  // String or array length.
  var list = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_MEMBER) || '[]';
  return [list + '.length', Blockly.Clang.ORDER_MEMBER];
};

Blockly.Clang['lists_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var list = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_MEMBER) || '[]';
  return ['!' + list + '.length', Blockly.Clang.ORDER_LOGICAL_NOT];
};

Blockly.Clang['lists_indexOf'] = function(block) {
  // Find an item in the list.
  var operator = block.getFieldValue('END') == 'FIRST' ?
      'indexOf' : 'lastIndexOf';
  var item = Blockly.Clang.valueToCode(block, 'FIND',
      Blockly.Clang.ORDER_NONE) || '\'\'';
  var list = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_MEMBER) || '[]';
  var code = list + '.' + operator + '(' + item + ')';
  if (block.workspace.options.oneBasedIndex) {
    return [code + ' + 1', Blockly.Clang.ORDER_ADDITION];
  }
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['lists_getIndex'] = function(block) {
  // Get element at index.
  // Note: Until January 2013 this block did not have MODE or WHERE inputs.
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var listOrder = (where == 'RANDOM') ? Blockly.Clang.ORDER_COMMA :
      Blockly.Clang.ORDER_MEMBER;
  var list = Blockly.Clang.valueToCode(block, 'VALUE', listOrder) || '[]';

  switch (where) {
    case ('FIRST'):
      if (mode == 'GET') {
        var code = list + '[0]';
        return [code, Blockly.Clang.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var code = list + '.shift()';
        return [code, Blockly.Clang.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '.shift();\n';
      }
      break;
    case ('LAST'):
      if (mode == 'GET') {
        var code = list + '.slice(-1)[0]';
        return [code, Blockly.Clang.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var code = list + '.pop()';
        return [code, Blockly.Clang.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '.pop();\n';
      }
      break;
    case ('FROM_START'):
      var at = Blockly.Clang.getAdjusted(block, 'AT');
      if (mode == 'GET') {
        var code = list + '[' + at + ']';
        return [code, Blockly.Clang.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var code = list + '.splice(' + at + ', 1)[0]';
        return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        return list + '.splice(' + at + ', 1);\n';
      }
      break;
    case ('FROM_END'):
      var at = Blockly.Clang.getAdjusted(block, 'AT', 1, true);
      if (mode == 'GET') {
        var code = list + '.slice(' + at + ')[0]';
        return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
      } else if (mode == 'GET_REMOVE') {
        var code = list + '.splice(' + at + ', 1)[0]';
        return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        return list + '.splice(' + at + ', 1);';
      }
      break;
    case ('RANDOM'):
      var functionName = Blockly.Clang.provideFunction_(
          'listsGetRandomItem',
          ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
              '(list, remove) {',
           '  var x = Math.floor(Math.random() * list.length);',
           '  if (remove) {',
           '    return list.splice(x, 1)[0];',
           '  } else {',
           '    return list[x];',
           '  }',
           '}']);
      code = functionName + '(' + list + ', ' + (mode != 'GET') + ')';
      if (mode == 'GET' || mode == 'GET_REMOVE') {
        return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        return code + ';\n';
      }
      break;
  }
  throw Error('Unhandled combination (lists_getIndex).');
};

Blockly.Clang['lists_setIndex'] = function(block) {
  // Set element at index.
  // Note: Until February 2013 this block did not have MODE or WHERE inputs.
  var list = Blockly.Clang.valueToCode(block, 'LIST',
      Blockly.Clang.ORDER_MEMBER) || '[]';
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var value = Blockly.Clang.valueToCode(block, 'TO',
      Blockly.Clang.ORDER_ASSIGNMENT) || 'null';
  // Cache non-trivial values to variables to prevent repeated look-ups.
  // Closure, which accesses and modifies 'list'.
  function cacheList() {
    if (list.match(/^\w+$/)) {
      return '';
    }
    var listVar = Blockly.Clang.variableDB_.getDistinctName(
        'tmpList', Blockly.VARIABLE_CATEGORY_NAME);
    var code = 'var ' + listVar + ' = ' + list + ';\n';
    list = listVar;
    return code;
  }
  switch (where) {
    case ('FIRST'):
      if (mode == 'SET') {
        return list + '[0] = ' + value + ';\n';
      } else if (mode == 'INSERT') {
        return list + '.unshift(' + value + ');\n';
      }
      break;
    case ('LAST'):
      if (mode == 'SET') {
        var code = cacheList();
        code += list + '[' + list + '.length - 1] = ' + value + ';\n';
        return code;
      } else if (mode == 'INSERT') {
        return list + '.push(' + value + ');\n';
      }
      break;
    case ('FROM_START'):
      var at = Blockly.Clang.getAdjusted(block, 'AT');
      if (mode == 'SET') {
        return list + '[' + at + '] = ' + value + ';\n';
      } else if (mode == 'INSERT') {
        return list + '.splice(' + at + ', 0, ' + value + ');\n';
      }
      break;
    case ('FROM_END'):
      var at = Blockly.Clang.getAdjusted(block, 'AT', 1, false,
          Blockly.Clang.ORDER_SUBTRACTION);
      var code = cacheList();
      if (mode == 'SET') {
        code += list + '[' + list + '.length - ' + at + '] = ' + value + ';\n';
        return code;
      } else if (mode == 'INSERT') {
        code += list + '.splice(' + list + '.length - ' + at + ', 0, ' + value +
            ');\n';
        return code;
      }
      break;
    case ('RANDOM'):
      var code = cacheList();
      var xVar = Blockly.Clang.variableDB_.getDistinctName(
          'tmpX', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'var ' + xVar + ' = Math.floor(Math.random() * ' + list +
          '.length);\n';
      if (mode == 'SET') {
        code += list + '[' + xVar + '] = ' + value + ';\n';
        return code;
      } else if (mode == 'INSERT') {
        code += list + '.splice(' + xVar + ', 0, ' + value + ');\n';
        return code;
      }
      break;
  }
  throw Error('Unhandled combination (lists_setIndex).');
};

/**
 * Returns an expression calculating the index into a list.
 * @param {string} listName Name of the list, used to calculate length.
 * @param {string} where The method of indexing, selected by dropdown in Blockly
 * @param {string=} opt_at The optional offset when indexing from start/end.
 * @return {string|undefined} Index expression.
 * @private
 */
Blockly.Clang.lists.getIndex_ = function(listName, where, opt_at) {
  if (where == 'FIRST') {
    return '0';
  } else if (where == 'FROM_END') {
    return listName + '.length - 1 - ' + opt_at;
  } else if (where == 'LAST') {
    return listName + '.length - 1';
  } else {
    return opt_at;
  }
};

Blockly.Clang['lists_getSublist'] = function(block) {
  // Get sublist.
  var list = Blockly.Clang.valueToCode(block, 'LIST',
      Blockly.Clang.ORDER_MEMBER) || '[]';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = list + '.slice(0)';
  } else if (list.match(/^\w+$/) ||
      (where1 != 'FROM_END' && where2 == 'FROM_START')) {
    // If the list is a variable or doesn't require a call for length, don't
    // generate a helper function.
    switch (where1) {
      case 'FROM_START':
        var at1 = Blockly.Clang.getAdjusted(block, 'AT1');
        break;
      case 'FROM_END':
        var at1 = Blockly.Clang.getAdjusted(block, 'AT1', 1, false,
            Blockly.Clang.ORDER_SUBTRACTION);
        at1 = list + '.length - ' + at1;
        break;
      case 'FIRST':
        var at1 = '0';
        break;
      default:
        throw Error('Unhandled option (lists_getSublist).');
    }
    switch (where2) {
      case 'FROM_START':
        var at2 = Blockly.Clang.getAdjusted(block, 'AT2', 1);
        break;
      case 'FROM_END':
        var at2 = Blockly.Clang.getAdjusted(block, 'AT2', 0, false,
            Blockly.Clang.ORDER_SUBTRACTION);
        at2 = list + '.length - ' + at2;
        break;
      case 'LAST':
        var at2 = list + '.length';
        break;
      default:
        throw Error('Unhandled option (lists_getSublist).');
    }
    code = list + '.slice(' + at1 + ', ' + at2 + ')';
  } else {
    var at1 = Blockly.Clang.getAdjusted(block, 'AT1');
    var at2 = Blockly.Clang.getAdjusted(block, 'AT2');
    var getIndex_ = Blockly.Clang.lists.getIndex_;
    var wherePascalCase = {'FIRST': 'First', 'LAST': 'Last',
        'FROM_START': 'FromStart', 'FROM_END': 'FromEnd'};
    var functionName = Blockly.Clang.provideFunction_(
        'subsequence' + wherePascalCase[where1] + wherePascalCase[where2],
        ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
            '(sequence' +
            // The value for 'FROM_END' and'FROM_START' depends on `at` so
            // we add it as a parameter.
            ((where1 == 'FROM_END' || where1 == 'FROM_START') ? ', at1' : '') +
            ((where2 == 'FROM_END' || where2 == 'FROM_START') ? ', at2' : '') +
            ') {',
          '  var start = ' + getIndex_('sequence', where1, 'at1') + ';',
          '  var end = ' + getIndex_('sequence', where2, 'at2') + ' + 1;',
          '  return sequence.slice(start, end);',
          '}']);
    var code = functionName + '(' + list +
        // The value for 'FROM_END' and 'FROM_START' depends on `at` so we
        // pass it.
        ((where1 == 'FROM_END' || where1 == 'FROM_START') ? ', ' + at1 : '') +
        ((where2 == 'FROM_END' || where2 == 'FROM_START') ? ', ' + at2 : '') +
        ')';
  }
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['lists_sort'] = function(block) {
  // Block for sorting a list.
  var list = Blockly.Clang.valueToCode(block, 'LIST',
      Blockly.Clang.ORDER_FUNCTION_CALL) || '[]';
  var direction = block.getFieldValue('DIRECTION') === '1' ? 1 : -1;
  var type = block.getFieldValue('TYPE');
  var getCompareFunctionName = Blockly.Clang.provideFunction_(
      'listsGetSortCompare',
      ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
          '(type, direction) {',
       '  var compareFuncs = {',
       '    "NUMERIC": function(a, b) {',
       '        return Number(a) - Number(b); },',
       '    "TEXT": function(a, b) {',
       '        return a.toString() > b.toString() ? 1 : -1; },',
       '    "IGNORE_CASE": function(a, b) {',
       '        return a.toString().toLowerCase() > ' +
          'b.toString().toLowerCase() ? 1 : -1; },',
       '  };',
       '  var compare = compareFuncs[type];',
       '  return function(a, b) { return compare(a, b) * direction; }',
       '}']);
  return [list + '.slice().sort(' +
      getCompareFunctionName + '("' + type + '", ' + direction + '))',
      Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['lists_split'] = function(block) {
  // Block for splitting text into a list, or joining a list into text.
  var input = Blockly.Clang.valueToCode(block, 'INPUT',
      Blockly.Clang.ORDER_MEMBER);
  var delimiter = Blockly.Clang.valueToCode(block, 'DELIM',
      Blockly.Clang.ORDER_NONE) || '\'\'';
  var mode = block.getFieldValue('MODE');
  if (mode == 'SPLIT') {
    if (!input) {
      input = '\'\'';
    }
    var functionName = 'split';
  } else if (mode == 'JOIN') {
    if (!input) {
      input = '[]';
    }
    var functionName = 'join';
  } else {
    throw Error('Unknown mode: ' + mode);
  }
  var code = input + '.' + functionName + '(' + delimiter + ')';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['lists_reverse'] = function(block) {
  // Block for reversing a list.
  var list = Blockly.Clang.valueToCode(block, 'LIST',
      Blockly.Clang.ORDER_FUNCTION_CALL) || '[]';
  var code = list + '.slice().reverse()';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

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

goog.provide('Blockly.Clang.logic');

goog.require('Blockly.Clang');


Blockly.Clang['controls_if'] = function(block) {
  // If/elseif/else condition.
  var n = 0;
  var code = '', branchCode, conditionCode;
  if (Blockly.Clang.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    code += Blockly.Clang.injectId(Blockly.Clang.STATEMENT_PREFIX,
        block);
  }
  do {
    conditionCode = Blockly.Clang.valueToCode(block, 'IF' + n,
        Blockly.Clang.ORDER_NONE) || 'false';
    branchCode = Blockly.Clang.statementToCode(block, 'DO' + n);
    if (Blockly.Clang.STATEMENT_SUFFIX) {
      branchCode = Blockly.Clang.prefixLines(
          Blockly.Clang.injectId(Blockly.Clang.STATEMENT_SUFFIX,
          block), Blockly.Clang.INDENT) + branchCode;
    }
    code += (n > 0 ? ' else ' : '') +
        'if (' + conditionCode + ') {\n' + branchCode + '}';
    ++n;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE') || Blockly.Clang.STATEMENT_SUFFIX) {
    branchCode = Blockly.Clang.statementToCode(block, 'ELSE');
    if (Blockly.Clang.STATEMENT_SUFFIX) {
      branchCode = Blockly.Clang.prefixLines(
          Blockly.Clang.injectId(Blockly.Clang.STATEMENT_SUFFIX,
          block), Blockly.Clang.INDENT) + branchCode;
    }
    code += ' else {\n' + branchCode + '}';
  }
  return code + '\n';
};

Blockly.Clang['controls_ifelse'] = Blockly.Clang['controls_if'];

Blockly.Clang['logic_compare'] = function(block) {
  // Comparison operator.
  var OPERATORS = {
    'EQ': '==',
    'NEQ': '!=',
    'LT': '<',
    'LTE': '<=',
    'GT': '>',
    'GTE': '>='
  };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ?
      Blockly.Clang.ORDER_EQUALITY : Blockly.Clang.ORDER_RELATIONAL;
  var argument0 = Blockly.Clang.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.Clang.valueToCode(block, 'B', order) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.Clang['logic_operation'] = function(block) {
  // Operations 'and', 'or'.
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.Clang.ORDER_LOGICAL_AND :
      Blockly.Clang.ORDER_LOGICAL_OR;
  var argument0 = Blockly.Clang.valueToCode(block, 'A', order);
  var argument1 = Blockly.Clang.valueToCode(block, 'B', order);
  if (!argument0 && !argument1) {
    // If there are no arguments, then the return value is false.
    argument0 = 'false';
    argument1 = 'false';
  } else {
    // Single missing arguments have no effect on the return value.
    var defaultArgument = (operator == '&&') ? 'true' : 'false';
    if (!argument0) {
      argument0 = defaultArgument;
    }
    if (!argument1) {
      argument1 = defaultArgument;
    }
  }
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.Clang['logic_negate'] = function(block) {
  // Negation.
  var order = Blockly.Clang.ORDER_LOGICAL_NOT;
  var argument0 = Blockly.Clang.valueToCode(block, 'BOOL', order) ||
      'true';
  var code = '!' + argument0;
  return [code, order];
};

Blockly.Clang['logic_boolean'] = function(block) {
  // Boolean values true and false.
  var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Blockly.Clang.ORDER_ATOMIC];
};

Blockly.Clang['logic_null'] = function(block) {
  // Null data type.
  return ['null', Blockly.Clang.ORDER_ATOMIC];
};

Blockly.Clang['logic_ternary'] = function(block) {
  // Ternary operator.
  var value_if = Blockly.Clang.valueToCode(block, 'IF',
      Blockly.Clang.ORDER_CONDITIONAL) || 'false';
  var value_then = Blockly.Clang.valueToCode(block, 'THEN',
      Blockly.Clang.ORDER_CONDITIONAL) || 'null';
  var value_else = Blockly.Clang.valueToCode(block, 'ELSE',
      Blockly.Clang.ORDER_CONDITIONAL) || 'null';
  var code = value_if + ' ? ' + value_then + ' : ' + value_else;
  return [code, Blockly.Clang.ORDER_CONDITIONAL];
};

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




/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for loop blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Clang.loops');

goog.require('Blockly.Clang');


Blockly.Clang['controls_repeat_ext'] = function(block) {
  // Repeat n times.
  if (block.getField('TIMES')) {
    // Internal number.
    var repeats = String(Number(block.getFieldValue('TIMES')));
  } else {
    // External number.
    var repeats = Blockly.Clang.valueToCode(block, 'TIMES',
        Blockly.Clang.ORDER_ASSIGNMENT) || '0';
  }
  var branch = Blockly.Clang.statementToCode(block, 'DO');
  branch = Blockly.Clang.addLoopTrap(branch, block);
  var code = '';
  var loopVar = Blockly.Clang.variableDB_.getDistinctName(
      'count', Blockly.VARIABLE_CATEGORY_NAME);
  var endVar = repeats;
  if (!repeats.match(/^\w+$/) && !Blockly.isNumber(repeats)) {
    endVar = Blockly.Clang.variableDB_.getDistinctName(
        'repeat_end', Blockly.VARIABLE_CATEGORY_NAME);
    code += 'var ' + endVar + ' = ' + repeats + ';\n';
  }
  code += 'for (var ' + loopVar + ' = 0; ' +
      loopVar + ' < ' + endVar + '; ' +
      loopVar + '++) {\n' +
      branch + '}\n';
  return code;
};

Blockly.Clang['controls_repeat'] =
    Blockly.Clang['controls_repeat_ext'];

Blockly.Clang['controls_whileUntil'] = function(block) {
  // Do while/until loop.
  var until = block.getFieldValue('MODE') == 'UNTIL';
  var argument0 = Blockly.Clang.valueToCode(block, 'BOOL',
      until ? Blockly.Clang.ORDER_LOGICAL_NOT :
      Blockly.Clang.ORDER_NONE) || 'false';
  var branch = Blockly.Clang.statementToCode(block, 'DO');
  branch = Blockly.Clang.addLoopTrap(branch, block);
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'while (' + argument0 + ') {\n' + branch + '}\n';
};

Blockly.Clang['controls_for'] = function(block) {
  // For loop.
  var variable0 = Blockly.Clang.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var argument0 = Blockly.Clang.valueToCode(block, 'FROM',
      Blockly.Clang.ORDER_ASSIGNMENT) || '0';
  var argument1 = Blockly.Clang.valueToCode(block, 'TO',
      Blockly.Clang.ORDER_ASSIGNMENT) || '0';
  var increment = Blockly.Clang.valueToCode(block, 'BY',
      Blockly.Clang.ORDER_ASSIGNMENT) || '1';
  var branch = Blockly.Clang.statementToCode(block, 'DO');
  branch = Blockly.Clang.addLoopTrap(branch, block);
  var code;
  if (Blockly.isNumber(argument0) && Blockly.isNumber(argument1) &&
      Blockly.isNumber(increment)) {
    // All arguments are simple numbers.
    var up = Number(argument0) <= Number(argument1);
    code = 'for (' + variable0 + ' = ' + argument0 + '; ' +
        variable0 + (up ? ' <= ' : ' >= ') + argument1 + '; ' +
        variable0;
    var step = Math.abs(Number(increment));
    if (step == 1) {
      code += up ? '++' : '--';
    } else {
      code += (up ? ' += ' : ' -= ') + step;
    }
    code += ') {\n' + branch + '}\n';
  } else {
    code = '';
    // Cache non-trivial values to variables to prevent repeated look-ups.
    var startVar = argument0;
    if (!argument0.match(/^\w+$/) && !Blockly.isNumber(argument0)) {
      startVar = Blockly.Clang.variableDB_.getDistinctName(
          variable0 + '_start', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'var ' + startVar + ' = ' + argument0 + ';\n';
    }
    var endVar = argument1;
    if (!argument1.match(/^\w+$/) && !Blockly.isNumber(argument1)) {
      endVar = Blockly.Clang.variableDB_.getDistinctName(
          variable0 + '_end', Blockly.VARIABLE_CATEGORY_NAME);
      code += 'var ' + endVar + ' = ' + argument1 + ';\n';
    }
    // Determine loop direction at start, in case one of the bounds
    // changes during loop execution.
    var incVar = Blockly.Clang.variableDB_.getDistinctName(
        variable0 + '_inc', Blockly.VARIABLE_CATEGORY_NAME);
    code += 'var ' + incVar + ' = ';
    if (Blockly.isNumber(increment)) {
      code += Math.abs(increment) + ';\n';
    } else {
      code += 'Math.abs(' + increment + ');\n';
    }
    code += 'if (' + startVar + ' > ' + endVar + ') {\n';
    code += Blockly.Clang.INDENT + incVar + ' = -' + incVar + ';\n';
    code += '}\n';
    code += 'for (' + variable0 + ' = ' + startVar + '; ' +
        incVar + ' >= 0 ? ' +
        variable0 + ' <= ' + endVar + ' : ' +
        variable0 + ' >= ' + endVar + '; ' +
        variable0 + ' += ' + incVar + ') {\n' +
        branch + '}\n';
  }
  return code;
};

Blockly.Clang['controls_forEach'] = function(block) {
  // For each loop.
  var variable0 = Blockly.Clang.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var argument0 = Blockly.Clang.valueToCode(block, 'LIST',
      Blockly.Clang.ORDER_ASSIGNMENT) || '[]';
  var branch = Blockly.Clang.statementToCode(block, 'DO');
  branch = Blockly.Clang.addLoopTrap(branch, block);
  var code = '';
  // Cache non-trivial values to variables to prevent repeated look-ups.
  var listVar = argument0;
  if (!argument0.match(/^\w+$/)) {
    listVar = Blockly.Clang.variableDB_.getDistinctName(
        variable0 + '_list', Blockly.VARIABLE_CATEGORY_NAME);
    code += 'var ' + listVar + ' = ' + argument0 + ';\n';
  }
  var indexVar = Blockly.Clang.variableDB_.getDistinctName(
      variable0 + '_index', Blockly.VARIABLE_CATEGORY_NAME);
  branch = Blockly.Clang.INDENT + variable0 + ' = ' +
      listVar + '[' + indexVar + '];\n' + branch;
  code += 'for (var ' + indexVar + ' in ' + listVar + ') {\n' + branch + '}\n';
  return code;
};

Blockly.Clang['controls_flow_statements'] = function(block) {
  // Flow statements: continue, break.
  var xfix = '';
  if (Blockly.Clang.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    xfix += Blockly.Clang.injectId(Blockly.Clang.STATEMENT_PREFIX,
        block);
  }
  if (Blockly.Clang.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the break/continue is triggered.
    xfix += Blockly.Clang.injectId(Blockly.Clang.STATEMENT_SUFFIX,
        block);
  }
  if (Blockly.Clang.STATEMENT_PREFIX) {
    var loop = Blockly.Constants.Loops
        .CONTROL_FLOW_IN_LOOP_CHECK_MIXIN.getSurroundLoop(block);
    if (loop && !loop.suppressPrefixSuffix) {
      // Inject loop's statement prefix here since the regular one at the end
      // of the loop will not get executed if 'continue' is triggered.
      // In the case of 'break', a prefix is needed due to the loop's suffix.
      xfix += Blockly.Clang.injectId(Blockly.Clang.STATEMENT_PREFIX,
          loop);
    }
  }
  switch (block.getFieldValue('FLOW')) {
    case 'BREAK':
      return xfix + 'break;\n';
    case 'CONTINUE':
      return xfix + 'continue;\n';
  }
  throw Error('Unknown flow statement.');
};

/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for math blocks.
 * @author q.neutron@gmail.com (Quynh Neutron)
 */
'use strict';

goog.provide('Blockly.Clang.math');

goog.require('Blockly.Clang');


Blockly.Clang['math_number'] = function(block) {
  // Numeric value.
  var code = Number(block.getFieldValue('NUM'));
  code = isNaN(code) ? Number(0) : code;
  var order = code >= 0 ? Blockly.Clang.ORDER_ATOMIC :
              Blockly.Clang.ORDER_UNARY_NEGATION;
  return [code, order];
};


Blockly.Clang['math_whole_number'] = Blockly.Clang['math_number'];
Blockly.Clang['math_positive_number'] = Blockly.Clang['math_number'];

Blockly.Clang['math_decimal'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_whole'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_0_60s'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_m100_p100'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_0_100'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_m150_p150'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_1_30'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_1_60'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_0_60'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_0_180'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_0_100k'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_0_255'] = Blockly.Clang['math_number'];
Blockly.Clang['math_decimal_0_9999'] = Blockly.Clang['math_number'];


Blockly.Clang['math_arithmetic'] = function(block) {
  // Basic arithmetic operators, and power.
  var OPERATORS = {
    'ADD': [' + ', Blockly.Clang.ORDER_ADDITION],
    'MINUS': [' - ', Blockly.Clang.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', Blockly.Clang.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', Blockly.Clang.ORDER_DIVISION],
    'POWER': [null, Blockly.Clang.ORDER_COMMA]  // Handle power separately.
  };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.Clang.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.Clang.valueToCode(block, 'B', order) || '0';
  var code;
  // Power in JavaScript requires a special case since it has no operator.
  if (!operator) {
    code = 'Math.pow(' + argument0 + ', ' + argument1 + ')';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
  }
  code = argument0 + operator + argument1;
  return [code, order];
};

Blockly.Clang['math_single'] = function(block) {
  // Math operators with single operand.
  var operator = block.getFieldValue('OP');
  var code;
  var arg;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = Blockly.Clang.valueToCode(block, 'NUM',
        Blockly.Clang.ORDER_UNARY_NEGATION) || '0';
    if (arg[0] == '-') {
      // --3 is not legal in JS.
      arg = ' ' + arg;
    }
    code = '-' + arg;
    return [code, Blockly.Clang.ORDER_UNARY_NEGATION];
  }
  if (operator == 'SIN' || operator == 'COS' || operator == 'TAN') {
    arg = Blockly.Clang.valueToCode(block, 'NUM',
        Blockly.Clang.ORDER_DIVISION) || '0';
  } else {
    arg = Blockly.Clang.valueToCode(block, 'NUM',
        Blockly.Clang.ORDER_NONE) || '0';
  }
  // First, handle cases which generate values that don't need parentheses
  // wrapping the code.
  switch (operator) {
    case 'ABS':
      code = 'Math.abs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'Math.sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'Math.log(' + arg + ')';
      break;
    case 'EXP':
      code = 'Math.exp(' + arg + ')';
      break;
    case 'POW10':
      code = 'Math.pow(10,' + arg + ')';
      break;
    case 'ROUND':
      code = 'Math.round(' + arg + ')';
      break;
    case 'ROUNDUP':
      code = 'Math.ceil(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'Math.floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'Math.sin(' + arg + ' / 180 * Math.PI)';
      break;
    case 'COS':
      code = 'Math.cos(' + arg + ' / 180 * Math.PI)';
      break;
    case 'TAN':
      code = 'Math.tan(' + arg + ' / 180 * Math.PI)';
      break;
  }
  if (code) {
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
  }
  // Second, handle cases which generate values that may need parentheses
  // wrapping the code.
  switch (operator) {
    case 'LOG10':
      code = 'Math.log(' + arg + ') / Math.log(10)';
      break;
    case 'ASIN':
      code = 'Math.asin(' + arg + ') / Math.PI * 180';
      break;
    case 'ACOS':
      code = 'Math.acos(' + arg + ') / Math.PI * 180';
      break;
    case 'ATAN':
      code = 'Math.atan(' + arg + ') / Math.PI * 180';
      break;
    default:
      throw Error('Unknown math operator: ' + operator);
  }
  return [code, Blockly.Clang.ORDER_DIVISION];
};

Blockly.Clang['math_constant'] = function(block) {
  // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
  var CONSTANTS = {
    'PI': ['Math.PI', Blockly.Clang.ORDER_MEMBER],
    'E': ['Math.E', Blockly.Clang.ORDER_MEMBER],
    'GOLDEN_RATIO':
        ['(1 + Math.sqrt(5)) / 2', Blockly.Clang.ORDER_DIVISION],
    'SQRT2': ['Math.SQRT2', Blockly.Clang.ORDER_MEMBER],
    'SQRT1_2': ['Math.SQRT1_2', Blockly.Clang.ORDER_MEMBER],
    'INFINITY': ['Infinity', Blockly.Clang.ORDER_ATOMIC]
  };
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

Blockly.Clang['math_number_property'] = function(block) {
  // Check if a number is even, odd, prime, whole, positive, or negative
  // or if it is divisible by certain number. Returns true or false.
  var number_to_check = Blockly.Clang.valueToCode(block, 'NUMBER_TO_CHECK',
      Blockly.Clang.ORDER_MODULUS) || '0';
  var dropdown_property = block.getFieldValue('PROPERTY');
  var code;
  if (dropdown_property == 'PRIME') {
    // Prime is a special case as it is not a one-liner test.
    var functionName = Blockly.Clang.provideFunction_(
        'mathIsPrime',
        ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ + '(n) {',
         '  // https://en.wikipedia.org/wiki/Primality_test#Naive_methods',
         '  if (n == 2 || n == 3) {',
         '    return true;',
         '  }',
         '  // False if n is NaN, negative, is 1, or not whole.',
         '  // And false if n is divisible by 2 or 3.',
         '  if (isNaN(n) || n <= 1 || n % 1 != 0 || n % 2 == 0 ||' +
            ' n % 3 == 0) {',
         '    return false;',
         '  }',
         '  // Check all the numbers of form 6k +/- 1, up to sqrt(n).',
         '  for (var x = 6; x <= Math.sqrt(n) + 1; x += 6) {',
         '    if (n % (x - 1) == 0 || n % (x + 1) == 0) {',
         '      return false;',
         '    }',
         '  }',
         '  return true;',
         '}']);
    code = functionName + '(' + number_to_check + ')';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
  }
  switch (dropdown_property) {
    case 'EVEN':
      code = number_to_check + ' % 2 == 0';
      break;
    case 'ODD':
      code = number_to_check + ' % 2 == 1';
      break;
    case 'WHOLE':
      code = number_to_check + ' % 1 == 0';
      break;
    case 'POSITIVE':
      code = number_to_check + ' > 0';
      break;
    case 'NEGATIVE':
      code = number_to_check + ' < 0';
      break;
    case 'DIVISIBLE_BY':
      var divisor = Blockly.Clang.valueToCode(block, 'DIVISOR',
          Blockly.Clang.ORDER_MODULUS) || '0';
      code = number_to_check + ' % ' + divisor + ' == 0';
      break;
  }
  return [code, Blockly.Clang.ORDER_EQUALITY];
};

Blockly.Clang['math_change'] = function(block) {
  // Add to a variable in place.
  var argument0 = Blockly.Clang.valueToCode(block, 'DELTA',
      Blockly.Clang.ORDER_ADDITION) || '0';
  var varName = Blockly.Clang.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  return varName + ' = (typeof ' + varName + ' == \'number\' ? ' + varName +
      ' : 0) + ' + argument0 + ';\n';
};

// Rounding functions have a single operand.
Blockly.Clang['math_round'] = Blockly.Clang['math_single'];
// Trigonometry functions have a single operand.
Blockly.Clang['math_trig'] = Blockly.Clang['math_single'];

Blockly.Clang['math_on_list'] = function(block) {
  // Math functions for lists.
  var func = block.getFieldValue('OP');
  var list, code;
  switch (func) {
    case 'SUM':
      list = Blockly.Clang.valueToCode(block, 'LIST',
          Blockly.Clang.ORDER_MEMBER) || '[]';
      code = list + '.reduce(function(x, y) {return x + y;})';
      break;
    case 'MIN':
      list = Blockly.Clang.valueToCode(block, 'LIST',
          Blockly.Clang.ORDER_COMMA) || '[]';
      code = 'Math.min.apply(null, ' + list + ')';
      break;
    case 'MAX':
      list = Blockly.Clang.valueToCode(block, 'LIST',
          Blockly.Clang.ORDER_COMMA) || '[]';
      code = 'Math.max.apply(null, ' + list + ')';
      break;
    case 'AVERAGE':
      // mathMean([null,null,1,3]) == 2.0.
      var functionName = Blockly.Clang.provideFunction_(
          'mathMean',
          ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
              '(myList) {',
            '  return myList.reduce(function(x, y) {return x + y;}) / ' +
                  'myList.length;',
            '}']);
      list = Blockly.Clang.valueToCode(block, 'LIST',
          Blockly.Clang.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    case 'MEDIAN':
      // mathMedian([null,null,1,3]) == 2.0.
      var functionName = Blockly.Clang.provideFunction_(
          'mathMedian',
          ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
              '(myList) {',
            '  var localList = myList.filter(function (x) ' +
              '{return typeof x == \'number\';});',
            '  if (!localList.length) return null;',
            '  localList.sort(function(a, b) {return b - a;});',
            '  if (localList.length % 2 == 0) {',
            '    return (localList[localList.length / 2 - 1] + ' +
              'localList[localList.length / 2]) / 2;',
            '  } else {',
            '    return localList[(localList.length - 1) / 2];',
            '  }',
            '}']);
      list = Blockly.Clang.valueToCode(block, 'LIST',
          Blockly.Clang.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    case 'MODE':
      // As a list of numbers can contain more than one mode,
      // the returned result is provided as an array.
      // Mode of [3, 'x', 'x', 1, 1, 2, '3'] -> ['x', 1].
      var functionName = Blockly.Clang.provideFunction_(
          'mathModes',
          ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
              '(values) {',
            '  var modes = [];',
            '  var counts = [];',
            '  var maxCount = 0;',
            '  for (var i = 0; i < values.length; i++) {',
            '    var value = values[i];',
            '    var found = false;',
            '    var thisCount;',
            '    for (var j = 0; j < counts.length; j++) {',
            '      if (counts[j][0] === value) {',
            '        thisCount = ++counts[j][1];',
            '        found = true;',
            '        break;',
            '      }',
            '    }',
            '    if (!found) {',
            '      counts.push([value, 1]);',
            '      thisCount = 1;',
            '    }',
            '    maxCount = Math.max(thisCount, maxCount);',
            '  }',
            '  for (var j = 0; j < counts.length; j++) {',
            '    if (counts[j][1] == maxCount) {',
            '        modes.push(counts[j][0]);',
            '    }',
            '  }',
            '  return modes;',
            '}']);
      list = Blockly.Clang.valueToCode(block, 'LIST',
          Blockly.Clang.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    case 'STD_DEV':
      var functionName = Blockly.Clang.provideFunction_(
          'mathStandardDeviation',
          ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
              '(numbers) {',
            '  var n = numbers.length;',
            '  if (!n) return null;',
            '  var mean = numbers.reduce(function(x, y) {return x + y;}) / n;',
            '  var variance = 0;',
            '  for (var j = 0; j < n; j++) {',
            '    variance += Math.pow(numbers[j] - mean, 2);',
            '  }',
            '  variance = variance / n;',
            '  return Math.sqrt(variance);',
            '}']);
      list = Blockly.Clang.valueToCode(block, 'LIST',
          Blockly.Clang.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    case 'RANDOM':
      var functionName = Blockly.Clang.provideFunction_(
          'mathRandomList',
          ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
              '(list) {',
            '  var x = Math.floor(Math.random() * list.length);',
            '  return list[x];',
            '}']);
      list = Blockly.Clang.valueToCode(block, 'LIST',
          Blockly.Clang.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    default:
      throw Error('Unknown operator: ' + func);
  }
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['math_modulo'] = function(block) {
  // Remainder computation.
  var argument0 = Blockly.Clang.valueToCode(block, 'DIVIDEND',
      Blockly.Clang.ORDER_MODULUS) || '0';
  var argument1 = Blockly.Clang.valueToCode(block, 'DIVISOR',
      Blockly.Clang.ORDER_MODULUS) || '0';
  var code = argument0 + ' % ' + argument1;
  return [code, Blockly.Clang.ORDER_MODULUS];
};

Blockly.Clang['math_constrain'] = function(block) {
  // Constrain a number between two limits.
  var argument0 = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_COMMA) || '0';
  var argument1 = Blockly.Clang.valueToCode(block, 'LOW',
      Blockly.Clang.ORDER_COMMA) || '0';
  var argument2 = Blockly.Clang.valueToCode(block, 'HIGH',
      Blockly.Clang.ORDER_COMMA) || 'Infinity';
  var code = 'Math.min(Math.max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['math_random_int'] = function(block) {
  // Random integer between [X] and [Y].
  var argument0 = Blockly.Clang.valueToCode(block, 'FROM',
      Blockly.Clang.ORDER_COMMA) || '0';
  var argument1 = Blockly.Clang.valueToCode(block, 'TO',
      Blockly.Clang.ORDER_COMMA) || '0';
  var functionName = Blockly.Clang.provideFunction_(
      'mathRandomInt',
      ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
          '(a, b) {',
       '  if (a > b) {',
       '    // Swap a and b to ensure a is smaller.',
       '    var c = a;',
       '    a = b;',
       '    b = c;',
       '  }',
       '  return Math.floor(Math.random() * (b - a + 1) + a);',
       '}']);
  var code = functionName + '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['math_random_float'] = function(block) {
  // Random fraction between 0 and 1.
  return ['Math.random()', Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['math_atan2'] = function(block) {
  // Arctangent of point (X, Y) in degrees from -180 to 180.
  var argument0 = Blockly.Clang.valueToCode(block, 'X',
      Blockly.Clang.ORDER_COMMA) || '0';
  var argument1 = Blockly.Clang.valueToCode(block, 'Y',
      Blockly.Clang.ORDER_COMMA) || '0';
  return ['Math.atan2(' + argument1 + ', ' + argument0 + ') / Math.PI * 180',
      Blockly.Clang.ORDER_DIVISION];
};

Blockly.Clang['matrix_symble_image'] = function(block) {
  // Numeric value.
  var order = Blockly.Clang.ORDER_NONE;
  var code = Blockly.Clang.valueToCode(block ,'SYMBLE', order);

  return [code, order];
};


Blockly.Clang['matrix_symble'] = function(block) {
  // Numeric value.
  var code = Number(block.getFieldValue('SYMBLE'));
  code = isNaN(code) ? Number(0) : code;
  var order = code >= 0 ? Blockly.Clang.ORDER_ATOMIC :
              Blockly.Clang.ORDER_UNARY_NEGATION;
  return [code, order];
};

Blockly.Clang['matrix_emotion_image'] = function(block) {
  // Numeric value.
  var order = Blockly.Clang.ORDER_NONE;
  var code = Blockly.Clang.valueToCode(block ,'EMOTION', order);

  return [code, order];
};

Blockly.Clang['matrix_emotion'] = function(block) {
  // Numeric value.
  var code = Number(block.getFieldValue('EMOTION'));
  code = isNaN(code) ? Number(0) : code;
  var order = code >= 0 ? Blockly.Clang.ORDER_ATOMIC :
              Blockly.Clang.ORDER_UNARY_NEGATION;
  return [code, order];
};
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



/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for math blocks.
 * @author q.neutron@gmail.com (Quynh Neutron)
 */

'use strict';

goog.provide('Blockly.Clang.operators');

goog.require('Blockly.Clang');


Blockly.Clang['operator_add'] = function (block) {

    var operator = ' + ';
    var order = Blockly.Clang.ORDER_ADDITION;
    var argument0 = Blockly.Clang.valueToCode(block, 'NUM1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'NUM2', order) || '0';
    var code;

    code = argument0 + operator + argument1;
    return [code, order];

};

Blockly.Clang['operator_subtract'] = function (block) {

    var operator = ' - ';
    var order = Blockly.Clang.ORDER_SUBTRACTION;
    var argument0 = Blockly.Clang.valueToCode(block, 'NUM1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'NUM2', order) || '0';
    var code;

    code = argument0 + operator + argument1;
    return [code, order];

};

Blockly.Clang['operator_multiply'] = function (block) {

    var operator = ' * ';
    var order = Blockly.Clang.ORDER_MULTIPLICATION;
    var argument0 = Blockly.Clang.valueToCode(block, 'NUM1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'NUM2', order) || '0';
    var code;

    code = argument0 + operator + argument1;
    return [code, order];

};

Blockly.Clang['operator_divide'] = function (block) {

    var operator = ' / ';
    var order = Blockly.Clang.ORDER_DIVISION;
    var argument0 = Blockly.Clang.valueToCode(block, 'NUM1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'NUM2', order) || '0';
    var code;

    code = argument0 + operator + argument1;
    return [code, order];

};


Blockly.Clang['operator_random'] = function (block) {

    var order = Blockly.Clang.ORDER_COMMA;
    var from = Blockly.Clang.valueToCode(block, 'FROM', order) || '0';
    var to = Blockly.Clang.valueToCode(block, 'TO', order) || '0';
    var code;

    code = 'random(' + from + ', ' + to + ')';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];

};


Blockly.Clang['operator_lt'] = function (block) {

    var order = Blockly.Clang.ORDER_RELATIONAL;
    var argument0 = Blockly.Clang.valueToCode(block, 'OPERAND1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'OPERAND2', order) || '0';
    var code;
    argument0 = Blockly.Clang.trimQuote(argument0);
    argument0 = argument0 || '0';
    argument1 = Blockly.Clang.trimQuote(argument1);
    argument1 = argument1 || '0';

    code = '' + argument0 + ' < ' + argument1 + '';
    return [code, order];

};


Blockly.Clang['operator_equals'] = function (block) {

    var order = Blockly.Clang.ORDER_EQUALITY;
    var argument0 = Blockly.Clang.valueToCode(block, 'OPERAND1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'OPERAND2', order) || '0';
    var code;
    argument0 = Blockly.Clang.trimQuote(argument0);
    argument0 = argument0 || '0';
    argument1 = Blockly.Clang.trimQuote(argument1);
    argument1 = argument1 || '0';

    code = '' + argument0 + ' == ' + argument1 + '';
    return [code, order];

};


Blockly.Clang['operator_gt'] = function (block) {

    var order = Blockly.Clang.ORDER_RELATIONAL;
    var argument0 = Blockly.Clang.valueToCode(block, 'OPERAND1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'OPERAND2', order) || '0';
    var code;

    argument0 = Blockly.Clang.trimQuote(argument0);
    argument0 = argument0 || '0';
    argument1 = Blockly.Clang.trimQuote(argument1);
    argument1 = argument1 || '0';

    code = '' + argument0 + ' > ' + argument1 + '';
    return [code, order];

};


Blockly.Clang['operator_and'] = function (block) {

    var order = Blockly.Clang.ORDER_LOGICAL_AND;
    var argument0 = Blockly.Clang.valueToCode(block, 'OPERAND1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'OPERAND2', order) || '0';
    var code;

    code = '' + argument0 + ' && ' + argument1 + '';
    return [code, order];

};

Blockly.Clang['operator_or'] = function (block) {

    var order = Blockly.Clang.ORDER_LOGICAL_OR;
    var argument0 = Blockly.Clang.valueToCode(block, 'OPERAND1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'OPERAND2', order) || '0';
    var code;

    code = '' + argument0 + ' || ' + argument1 + '';
    return [code, order];

};

Blockly.Clang['operator_not'] = function (block) {

    var order = Blockly.Clang.ORDER_LOGICAL_NOT;
    var argument0 = Blockly.Clang.valueToCode(block, 'OPERAND', order) || '0';
    var code;

    code = '!' + argument0;
    return [code, order];

};


Blockly.Clang['operator_mod'] = function (block) {

    var order = Blockly.Clang.ORDER_COMMA;
    var argument0 = Blockly.Clang.valueToCode(block, 'NUM1', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'NUM2', order) || '0';
    var code;

    code = 'math_modulus(' + argument0 + ', ' + argument1 + ')';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];

};


Blockly.Clang['operator_round'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;
    var argument0 = Blockly.Clang.valueToCode(block, 'NUM', order) || '0';
    var code;

    code = 'math_round(' + argument0 + ')';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];

};

Blockly.Clang['operator_mathop'] = function (block) {

    var order = Blockly.Clang.ORDER_NONE;

    var argument0 = Blockly.Clang.valueToCode(block, 'NUM', order) || '0';
    var code;

    var mathop = {
        'abs': 'math_abs',
        'floor': 'math_floor',
        'ceiling': 'math_ceiling',
        'sqrt': 'math_sqrt',
        'sin': 'math_sin',
        'cos': 'math_cos',
        'tan': 'math_tan',
        'asin': 'math_asin',
        'acos': 'math_acos',
        'atan': 'math_atan',
        'ln': 'math_ln',
        'log': 'math_log',
        'e ^': 'math_exp',
        '10 ^': 'math_pow10'
    };

    var operator = mathop[block.getFieldValue('OPERATOR')];

    code = operator + '( ' + argument0 + ' )';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];

};


Blockly.Clang['math_number'] = function (block) {
    // Numeric value.
    var code = Number(block.getFieldValue('NUM'));
    var order = code >= 0 ? Blockly.Clang.ORDER_ATOMIC :
        Blockly.Clang.ORDER_UNARY_NEGATION;
    return [code, order];
};

Blockly.Clang['math_arithmetic'] = function (block) {
    // Basic arithmetic operators, and power.
    var OPERATORS = {
        'ADD': [' + ', Blockly.Clang.ORDER_ADDITION],
        'MINUS': [' - ', Blockly.Clang.ORDER_SUBTRACTION],
        'MULTIPLY': [' * ', Blockly.Clang.ORDER_MULTIPLICATION],
        'DIVIDE': [' / ', Blockly.Clang.ORDER_DIVISION],
        'POWER': [null, Blockly.Clang.ORDER_COMMA]  // Handle power separately.
    };
    var tuple = OPERATORS[block.getFieldValue('OP')];
    var operator = tuple[0];
    var order = tuple[1];
    var argument0 = Blockly.Clang.valueToCode(block, 'A', order) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'B', order) || '0';
    var code;
    // Power in JavaScript requires a special case since it has no operator.
    if (!operator) {
        code = 'Math.pow(' + argument0 + ', ' + argument1 + ')';
        return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    }
    code = argument0 + operator + argument1;
    return [code, order];
};

Blockly.Clang['math_single'] = function (block) {
    // Math operators with single operand.
    var operator = block.getFieldValue('OP');
    var code;
    var arg;
    if (operator == 'NEG') {
        // Negation is a special case given its different operator precedence.
        arg = Blockly.Clang.valueToCode(block, 'NUM',
            Blockly.Clang.ORDER_UNARY_NEGATION) || '0';
        if (arg[0] == '-') {
            // --3 is not legal in JS.
            arg = ' ' + arg;
        }
        code = '-' + arg;
        return [code, Blockly.Clang.ORDER_UNARY_NEGATION];
    }
    if (operator == 'SIN' || operator == 'COS' || operator == 'TAN') {
        arg = Blockly.Clang.valueToCode(block, 'NUM',
            Blockly.Clang.ORDER_DIVISION) || '0';
    } else {
        arg = Blockly.Clang.valueToCode(block, 'NUM',
            Blockly.Clang.ORDER_NONE) || '0';
    }
    // First, handle cases which generate values that don't need parentheses
    // wrapping the code.
    switch (operator) {
        case 'ABS':
            code = 'Math.abs(' + arg + ')';
            break;
        case 'ROOT':
            code = 'Math.sqrt(' + arg + ')';
            break;
        case 'LN':
            code = 'Math.log(' + arg + ')';
            break;
        case 'EXP':
            code = 'Math.exp(' + arg + ')';
            break;
        case 'POW10':
            code = 'Math.pow(10,' + arg + ')';
            break;
        case 'ROUND':
            code = 'Math.round(' + arg + ')';
            break;
        case 'ROUNDUP':
            code = 'Math.ceil(' + arg + ')';
            break;
        case 'ROUNDDOWN':
            code = 'Math.floor(' + arg + ')';
            break;
        case 'SIN':
            code = 'Math.sin(' + arg + ' / 180 * Math.PI)';
            break;
        case 'COS':
            code = 'Math.cos(' + arg + ' / 180 * Math.PI)';
            break;
        case 'TAN':
            code = 'Math.tan(' + arg + ' / 180 * Math.PI)';
            break;
    }
    if (code) {
        return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    }
    // Second, handle cases which generate values that may need parentheses
    // wrapping the code.
    switch (operator) {
        case 'LOG10':
            code = 'Math.log(' + arg + ') / Math.log(10)';
            break;
        case 'ASIN':
            code = 'Math.asin(' + arg + ') / Math.PI * 180';
            break;
        case 'ACOS':
            code = 'Math.acos(' + arg + ') / Math.PI * 180';
            break;
        case 'ATAN':
            code = 'Math.atan(' + arg + ') / Math.PI * 180';
            break;
        default:
            throw Error('Unknown math operator: ' + operator);
    }
    return [code, Blockly.Clang.ORDER_DIVISION];
};

Blockly.Clang['math_constant'] = function (block) {
    // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
    var CONSTANTS = {
        'PI': ['Math.PI', Blockly.Clang.ORDER_MEMBER],
        'E': ['Math.E', Blockly.Clang.ORDER_MEMBER],
        'GOLDEN_RATIO':
            ['(1 + Math.sqrt(5)) / 2', Blockly.Clang.ORDER_DIVISION],
        'SQRT2': ['Math.SQRT2', Blockly.Clang.ORDER_MEMBER],
        'SQRT1_2': ['Math.SQRT1_2', Blockly.Clang.ORDER_MEMBER],
        'INFINITY': ['Infinity', Blockly.Clang.ORDER_ATOMIC]
    };
    return CONSTANTS[block.getFieldValue('CONSTANT')];
};

Blockly.Clang['math_number_property'] = function (block) {
    // Check if a number is even, odd, prime, whole, positive, or negative
    // or if it is divisible by certain number. Returns true or false.
    var number_to_check = Blockly.Clang.valueToCode(block, 'NUMBER_TO_CHECK',
        Blockly.Clang.ORDER_MODULUS) || '0';
    var dropdown_property = block.getFieldValue('PROPERTY');
    var code;
    if (dropdown_property == 'PRIME') {
        // Prime is a special case as it is not a one-liner test.
        var functionName = Blockly.Clang.provideFunction_(
            'mathIsPrime',
            ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ + '(n) {',
                '  // https://en.wikipedia.org/wiki/Primality_test#Naive_methods',
                '  if (n == 2 || n == 3) {',
                '    return true;',
                '  }',
                '  // False if n is NaN, negative, is 1, or not whole.',
                '  // And false if n is divisible by 2 or 3.',
            '  if (isNaN(n) || n <= 1 || n % 1 != 0 || n % 2 == 0 ||' +
            ' n % 3 == 0) {',
                '    return false;',
                '  }',
                '  // Check all the numbers of form 6k +/- 1, up to sqrt(n).',
                '  for (var x = 6; x <= Math.sqrt(n) + 1; x += 6) {',
                '    if (n % (x - 1) == 0 || n % (x + 1) == 0) {',
                '      return false;',
                '    }',
                '  }',
                '  return true;',
                '}']);
        code = functionName + '(' + number_to_check + ')';
        return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    }
    switch (dropdown_property) {
        case 'EVEN':
            code = number_to_check + ' % 2 == 0';
            break;
        case 'ODD':
            code = number_to_check + ' % 2 == 1';
            break;
        case 'WHOLE':
            code = number_to_check + ' % 1 == 0';
            break;
        case 'POSITIVE':
            code = number_to_check + ' > 0';
            break;
        case 'NEGATIVE':
            code = number_to_check + ' < 0';
            break;
        case 'DIVISIBLE_BY':
            var divisor = Blockly.Clang.valueToCode(block, 'DIVISOR',
                Blockly.Clang.ORDER_MODULUS) || '0';
            code = number_to_check + ' % ' + divisor + ' == 0';
            break;
    }
    return [code, Blockly.Clang.ORDER_EQUALITY];
};

Blockly.Clang['math_change'] = function (block) {
    // Add to a variable in place.
    var argument0 = Blockly.Clang.valueToCode(block, 'DELTA',
        Blockly.Clang.ORDER_ADDITION) || '0';
    var varName = Blockly.Clang.variableDB_.getName(
        block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    return varName + ' = (typeof ' + varName + ' == \'number\' ? ' + varName +
        ' : 0) + ' + argument0 + ';\n';
};

// Rounding functions have a single operand.
Blockly.Clang['math_round'] = Blockly.Clang['math_single'];
// Trigonometry functions have a single operand.
Blockly.Clang['math_trig'] = Blockly.Clang['math_single'];

Blockly.Clang['math_on_list'] = function (block) {
    // Math functions for lists.
    var func = block.getFieldValue('OP');
    var list, code;
    switch (func) {
        case 'SUM':
            list = Blockly.Clang.valueToCode(block, 'LIST',
                Blockly.Clang.ORDER_MEMBER) || '[]';
            code = list + '.reduce(function(x, y) {return x + y;})';
            break;
        case 'MIN':
            list = Blockly.Clang.valueToCode(block, 'LIST',
                Blockly.Clang.ORDER_COMMA) || '[]';
            code = 'Math.min.apply(null, ' + list + ')';
            break;
        case 'MAX':
            list = Blockly.Clang.valueToCode(block, 'LIST',
                Blockly.Clang.ORDER_COMMA) || '[]';
            code = 'Math.max.apply(null, ' + list + ')';
            break;
        case 'AVERAGE':
            // mathMean([null,null,1,3]) == 2.0.
            var functionName = Blockly.Clang.provideFunction_(
                'mathMean',
                ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
                    '(myList) {',
                '  return myList.reduce(function(x, y) {return x + y;}) / ' +
                'myList.length;',
                    '}']);
            list = Blockly.Clang.valueToCode(block, 'LIST',
                Blockly.Clang.ORDER_NONE) || '[]';
            code = functionName + '(' + list + ')';
            break;
        case 'MEDIAN':
            // mathMedian([null,null,1,3]) == 2.0.
            var functionName = Blockly.Clang.provideFunction_(
                'mathMedian',
                ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
                    '(myList) {',
                '  var localList = myList.filter(function (x) ' +
                '{return typeof x == \'number\';});',
                    '  if (!localList.length) return null;',
                    '  localList.sort(function(a, b) {return b - a;});',
                    '  if (localList.length % 2 == 0) {',
                '    return (localList[localList.length / 2 - 1] + ' +
                'localList[localList.length / 2]) / 2;',
                    '  } else {',
                    '    return localList[(localList.length - 1) / 2];',
                    '  }',
                    '}']);
            list = Blockly.Clang.valueToCode(block, 'LIST',
                Blockly.Clang.ORDER_NONE) || '[]';
            code = functionName + '(' + list + ')';
            break;
        case 'MODE':
            // As a list of numbers can contain more than one mode,
            // the returned result is provided as an array.
            // Mode of [3, 'x', 'x', 1, 1, 2, '3'] -> ['x', 1].
            var functionName = Blockly.Clang.provideFunction_(
                'mathModes',
                ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
                    '(values) {',
                    '  var modes = [];',
                    '  var counts = [];',
                    '  var maxCount = 0;',
                    '  for (var i = 0; i < values.length; i++) {',
                    '    var value = values[i];',
                    '    var found = false;',
                    '    var thisCount;',
                    '    for (var j = 0; j < counts.length; j++) {',
                    '      if (counts[j][0] === value) {',
                    '        thisCount = ++counts[j][1];',
                    '        found = true;',
                    '        break;',
                    '      }',
                    '    }',
                    '    if (!found) {',
                    '      counts.push([value, 1]);',
                    '      thisCount = 1;',
                    '    }',
                    '    maxCount = Math.max(thisCount, maxCount);',
                    '  }',
                    '  for (var j = 0; j < counts.length; j++) {',
                    '    if (counts[j][1] == maxCount) {',
                    '        modes.push(counts[j][0]);',
                    '    }',
                    '  }',
                    '  return modes;',
                    '}']);
            list = Blockly.Clang.valueToCode(block, 'LIST',
                Blockly.Clang.ORDER_NONE) || '[]';
            code = functionName + '(' + list + ')';
            break;
        case 'STD_DEV':
            var functionName = Blockly.Clang.provideFunction_(
                'mathStandardDeviation',
                ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
                    '(numbers) {',
                    '  var n = numbers.length;',
                    '  if (!n) return null;',
                    '  var mean = numbers.reduce(function(x, y) {return x + y;}) / n;',
                    '  var variance = 0;',
                    '  for (var j = 0; j < n; j++) {',
                    '    variance += Math.pow(numbers[j] - mean, 2);',
                    '  }',
                    '  variance = variance / n;',
                    '  return Math.sqrt(variance);',
                    '}']);
            list = Blockly.Clang.valueToCode(block, 'LIST',
                Blockly.Clang.ORDER_NONE) || '[]';
            code = functionName + '(' + list + ')';
            break;
        case 'RANDOM':
            var functionName = Blockly.Clang.provideFunction_(
                'mathRandomList',
                ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
                    '(list) {',
                    '  var x = Math.floor(Math.random() * list.length);',
                    '  return list[x];',
                    '}']);
            list = Blockly.Clang.valueToCode(block, 'LIST',
                Blockly.Clang.ORDER_NONE) || '[]';
            code = functionName + '(' + list + ')';
            break;
        default:
            throw Error('Unknown operator: ' + func);
    }
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['math_modulo'] = function (block) {
    // Remainder computation.
    var argument0 = Blockly.Clang.valueToCode(block, 'DIVIDEND',
        Blockly.Clang.ORDER_MODULUS) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'DIVISOR',
        Blockly.Clang.ORDER_MODULUS) || '0';
    var code = argument0 + ' % ' + argument1;
    return [code, Blockly.Clang.ORDER_MODULUS];
};

Blockly.Clang['math_constrain'] = function (block) {
    // Constrain a number between two limits.
    var argument0 = Blockly.Clang.valueToCode(block, 'VALUE',
        Blockly.Clang.ORDER_COMMA) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'LOW',
        Blockly.Clang.ORDER_COMMA) || '0';
    var argument2 = Blockly.Clang.valueToCode(block, 'HIGH',
        Blockly.Clang.ORDER_COMMA) || 'Infinity';
    var code = 'Math.min(Math.max(' + argument0 + ', ' + argument1 + '), ' +
        argument2 + ')';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['math_random_int'] = function (block) {
    // Random integer between [X] and [Y].
    var argument0 = Blockly.Clang.valueToCode(block, 'FROM',
        Blockly.Clang.ORDER_COMMA) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'TO',
        Blockly.Clang.ORDER_COMMA) || '0';
    var functionName = Blockly.Clang.provideFunction_(
        'mathRandomInt',
        ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
            '(a, b) {',
            '  if (a > b) {',
            '    // Swap a and b to ensure a is smaller.',
            '    var c = a;',
            '    a = b;',
            '    b = c;',
            '  }',
            '  return Math.floor(Math.random() * (b - a + 1) + a);',
            '}']);
    var code = functionName + '(' + argument0 + ', ' + argument1 + ')';
    return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['math_random_float'] = function (block) {
    // Random fraction between 0 and 1.
    return ['Math.random()', Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['math_atan2'] = function (block) {
    // Arctangent of point (X, Y) in degrees from -180 to 180.
    var argument0 = Blockly.Clang.valueToCode(block, 'X',
        Blockly.Clang.ORDER_COMMA) || '0';
    var argument1 = Blockly.Clang.valueToCode(block, 'Y',
        Blockly.Clang.ORDER_COMMA) || '0';
    return ['Math.atan2(' + argument1 + ', ' + argument0 + ') / Math.PI * 180',
    Blockly.Clang.ORDER_DIVISION];
};

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

/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for text blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Clang.texts');

goog.require('Blockly.Clang');


Blockly.Clang['text'] = function(block) {
  // Text value.
  var code = Blockly.Clang.quote_(block.getFieldValue('TEXT'));
  return [code, Blockly.Clang.ORDER_ATOMIC];
};

Blockly.Clang['text_multiline'] = function(block) {
  // Text value.
  var code = Blockly.Clang.multiline_quote_(block.getFieldValue('TEXT'));
  if (code.indexOf('\n') != -1) {
      code = '(' + code + ')'
  }
  return [code, Blockly.Clang.ORDER_ATOMIC];
};

/**
 * Enclose the provided value in 'String(...)' function.
 * Leave string literals alone.
 * @param {string} value Code evaluating to a value.
 * @return {string} Code evaluating to a string.
 * @private
 */
Blockly.Clang.text.forceString_ = function(value) {
  if (Blockly.Clang.text.forceString_.strRegExp.test(value)) {
    return value;
  }
  return 'String(' + value + ')';
};

/**
 * Regular expression to detect a single-quoted string literal.
 */
Blockly.Clang.text.forceString_.strRegExp = /^\s*'([^']|\\')*'\s*$/;

Blockly.Clang['text_join'] = function(block) {
  // Create a string made up of any number of elements of any type.
  switch (block.itemCount_) {
    case 0:
      return ['\'\'', Blockly.Clang.ORDER_ATOMIC];
    case 1:
      var element = Blockly.Clang.valueToCode(block, 'ADD0',
          Blockly.Clang.ORDER_NONE) || '\'\'';
      var code = Blockly.Clang.text.forceString_(element);
      return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    case 2:
      var element0 = Blockly.Clang.valueToCode(block, 'ADD0',
          Blockly.Clang.ORDER_NONE) || '\'\'';
      var element1 = Blockly.Clang.valueToCode(block, 'ADD1',
          Blockly.Clang.ORDER_NONE) || '\'\'';
      var code = Blockly.Clang.text.forceString_(element0) + ' + ' +
          Blockly.Clang.text.forceString_(element1);
      return [code, Blockly.Clang.ORDER_ADDITION];
    default:
      var elements = new Array(block.itemCount_);
      for (var i = 0; i < block.itemCount_; i++) {
        elements[i] = Blockly.Clang.valueToCode(block, 'ADD' + i,
            Blockly.Clang.ORDER_COMMA) || '\'\'';
      }
      var code = '[' + elements.join(',') + '].join(\'\')';
      return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
  }
};

Blockly.Clang['text_append'] = function(block) {
  // Append to a variable in place.
  var varName = Blockly.Clang.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var value = Blockly.Clang.valueToCode(block, 'TEXT',
      Blockly.Clang.ORDER_NONE) || '\'\'';
  return varName + ' += ' + Blockly.Clang.text.forceString_(value) + ';\n';
};

Blockly.Clang['text_length'] = function(block) {
  // String or array length.
  var text = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_FUNCTION_CALL) || '\'\'';
  return [text + '.length', Blockly.Clang.ORDER_MEMBER];
};

Blockly.Clang['text_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var text = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_MEMBER) || '\'\'';
  return ['!' + text + '.length', Blockly.Clang.ORDER_LOGICAL_NOT];
};

Blockly.Clang['text_indexOf'] = function(block) {
  // Search the text for a substring.
  var operator = block.getFieldValue('END') == 'FIRST' ?
      'indexOf' : 'lastIndexOf';
  var substring = Blockly.Clang.valueToCode(block, 'FIND',
      Blockly.Clang.ORDER_NONE) || '\'\'';
  var text = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_MEMBER) || '\'\'';
  var code = text + '.' + operator + '(' + substring + ')';
  // Adjust index if using one-based indices.
  if (block.workspace.options.oneBasedIndex) {
    return [code + ' + 1', Blockly.Clang.ORDER_ADDITION];
  }
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['text_charAt'] = function(block) {
  // Get letter at index.
  // Note: Until January 2013 this block did not have the WHERE input.
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var textOrder = (where == 'RANDOM') ? Blockly.Clang.ORDER_NONE :
      Blockly.Clang.ORDER_MEMBER;
  var text = Blockly.Clang.valueToCode(block, 'VALUE',
      textOrder) || '\'\'';
  switch (where) {
    case 'FIRST':
      var code = text + '.charAt(0)';
      return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    case 'LAST':
      var code = text + '.slice(-1)';
      return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    case 'FROM_START':
      var at = Blockly.Clang.getAdjusted(block, 'AT');
      // Adjust index if using one-based indices.
      var code = text + '.charAt(' + at + ')';
      return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    case 'FROM_END':
      var at = Blockly.Clang.getAdjusted(block, 'AT', 1, true);
      var code = text + '.slice(' + at + ').charAt(0)';
      return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
    case 'RANDOM':
      var functionName = Blockly.Clang.provideFunction_(
          'textRandomLetter',
          ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
              '(text) {',
           '  var x = Math.floor(Math.random() * text.length);',
           '  return text[x];',
           '}']);
      var code = functionName + '(' + text + ')';
      return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
  }
  throw Error('Unhandled option (text_charAt).');
};

/**
 * Returns an expression calculating the index into a string.
 * @param {string} stringName Name of the string, used to calculate length.
 * @param {string} where The method of indexing, selected by dropdown in Blockly
 * @param {string=} opt_at The optional offset when indexing from start/end.
 * @return {string|undefined} Index expression.
 * @private
 */
Blockly.Clang.text.getIndex_ = function(stringName, where, opt_at) {
  if (where == 'FIRST') {
    return '0';
  } else if (where == 'FROM_END') {
    return stringName + '.length - 1 - ' + opt_at;
  } else if (where == 'LAST') {
    return stringName + '.length - 1';
  } else {
    return opt_at;
  }
};

Blockly.Clang['text_getSubstring'] = function(block) {
  // Get substring.
  var text = Blockly.Clang.valueToCode(block, 'STRING',
      Blockly.Clang.ORDER_FUNCTION_CALL) || '\'\'';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = text;
  } else if (text.match(/^'?\w+'?$/) ||
      (where1 != 'FROM_END' && where1 != 'LAST' &&
      where2 != 'FROM_END' && where2 != 'LAST')) {
    // If the text is a variable or literal or doesn't require a call for
    // length, don't generate a helper function.
    switch (where1) {
      case 'FROM_START':
        var at1 = Blockly.Clang.getAdjusted(block, 'AT1');
        break;
      case 'FROM_END':
        var at1 = Blockly.Clang.getAdjusted(block, 'AT1', 1, false,
            Blockly.Clang.ORDER_SUBTRACTION);
        at1 = text + '.length - ' + at1;
        break;
      case 'FIRST':
        var at1 = '0';
        break;
      default:
        throw Error('Unhandled option (text_getSubstring).');
    }
    switch (where2) {
      case 'FROM_START':
        var at2 = Blockly.Clang.getAdjusted(block, 'AT2', 1);
        break;
      case 'FROM_END':
        var at2 = Blockly.Clang.getAdjusted(block, 'AT2', 0, false,
            Blockly.Clang.ORDER_SUBTRACTION);
        at2 = text + '.length - ' + at2;
        break;
      case 'LAST':
        var at2 = text + '.length';
        break;
      default:
        throw Error('Unhandled option (text_getSubstring).');
    }
    code = text + '.slice(' + at1 + ', ' + at2 + ')';
  } else {
    var at1 = Blockly.Clang.getAdjusted(block, 'AT1');
    var at2 = Blockly.Clang.getAdjusted(block, 'AT2');
    var getIndex_ = Blockly.Clang.text.getIndex_;
    var wherePascalCase = {'FIRST': 'First', 'LAST': 'Last',
      'FROM_START': 'FromStart', 'FROM_END': 'FromEnd'};
    var functionName = Blockly.Clang.provideFunction_(
        'subsequence' + wherePascalCase[where1] + wherePascalCase[where2],
        ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
        '(sequence' +
        // The value for 'FROM_END' and'FROM_START' depends on `at` so
        // we add it as a parameter.
        ((where1 == 'FROM_END' || where1 == 'FROM_START') ? ', at1' : '') +
        ((where2 == 'FROM_END' || where2 == 'FROM_START') ? ', at2' : '') +
        ') {',
          '  var start = ' + getIndex_('sequence', where1, 'at1') + ';',
          '  var end = ' + getIndex_('sequence', where2, 'at2') + ' + 1;',
          '  return sequence.slice(start, end);',
          '}']);
    var code = functionName + '(' + text +
        // The value for 'FROM_END' and 'FROM_START' depends on `at` so we
        // pass it.
        ((where1 == 'FROM_END' || where1 == 'FROM_START') ? ', ' + at1 : '') +
        ((where2 == 'FROM_END' || where2 == 'FROM_START') ? ', ' + at2 : '') +
        ')';
  }
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['text_changeCase'] = function(block) {
  // Change capitalization.
  var OPERATORS = {
    'UPPERCASE': '.toUpperCase()',
    'LOWERCASE': '.toLowerCase()',
    'TITLECASE': null
  };
  var operator = OPERATORS[block.getFieldValue('CASE')];
  var textOrder = operator ? Blockly.Clang.ORDER_MEMBER :
      Blockly.Clang.ORDER_NONE;
  var text = Blockly.Clang.valueToCode(block, 'TEXT',
      textOrder) || '\'\'';
  if (operator) {
    // Upper and lower case are functions built into JavaScript.
    var code = text + operator;
  } else {
    // Title case is not a native JavaScript function.  Define one.
    var functionName = Blockly.Clang.provideFunction_(
        'textToTitleCase',
        ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
            '(str) {',
         '  return str.replace(/\\S+/g,',
         '      function(txt) {return txt[0].toUpperCase() + ' +
            'txt.substring(1).toLowerCase();});',
         '}']);
    var code = functionName + '(' + text + ')';
  }
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['text_trim'] = function(block) {
  // Trim spaces.
  var OPERATORS = {
    'LEFT': ".replace(/^[\\s\\xa0]+/, '')",
    'RIGHT': ".replace(/[\\s\\xa0]+$/, '')",
    'BOTH': '.trim()'
  };
  var operator = OPERATORS[block.getFieldValue('MODE')];
  var text = Blockly.Clang.valueToCode(block, 'TEXT',
      Blockly.Clang.ORDER_MEMBER) || '\'\'';
  return [text + operator, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['text_print'] = function(block) {
  // Print statement.
  var msg = Blockly.Clang.valueToCode(block, 'TEXT',
      Blockly.Clang.ORDER_NONE) || '\'\'';
  return 'window.alert(' + msg + ');\n';
};

Blockly.Clang['text_prompt_ext'] = function(block) {
  // Prompt function.
  if (block.getField('TEXT')) {
    // Internal message.
    var msg = Blockly.Clang.quote_(block.getFieldValue('TEXT'));
  } else {
    // External message.
    var msg = Blockly.Clang.valueToCode(block, 'TEXT',
        Blockly.Clang.ORDER_NONE) || '\'\'';
  }
  var code = 'window.prompt(' + msg + ')';
  var toNumber = block.getFieldValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = 'Number(' + code + ')';
  }
  return [code, Blockly.Clang.ORDER_FUNCTION_CALL];
};

Blockly.Clang['text_prompt'] = Blockly.Clang['text_prompt_ext'];

Blockly.Clang['text_count'] = function(block) {
  var text = Blockly.Clang.valueToCode(block, 'TEXT',
      Blockly.Clang.ORDER_MEMBER) || '\'\'';
  var sub = Blockly.Clang.valueToCode(block, 'SUB',
      Blockly.Clang.ORDER_NONE) || '\'\'';
  var functionName = Blockly.Clang.provideFunction_(
      'textCount',
      ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
          '(haystack, needle) {',
       '  if (needle.length === 0) {',
       '    return haystack.length + 1;',
       '  } else {',
       '    return haystack.split(needle).length - 1;',
       '  }',
       '}']);
  var code = functionName + '(' + text + ', ' + sub + ')';
  return [code, Blockly.Clang.ORDER_SUBTRACTION];
};

Blockly.Clang['text_replace'] = function(block) {
  var text = Blockly.Clang.valueToCode(block, 'TEXT',
      Blockly.Clang.ORDER_MEMBER) || '\'\'';
  var from = Blockly.Clang.valueToCode(block, 'FROM',
      Blockly.Clang.ORDER_NONE) || '\'\'';
  var to = Blockly.Clang.valueToCode(block, 'TO',
      Blockly.Clang.ORDER_NONE) || '\'\'';
  // The regex escaping code below is taken from the implementation of
  // goog.string.regExpEscape.
  var functionName = Blockly.Clang.provideFunction_(
      'textReplace',
      ['function ' + Blockly.Clang.FUNCTION_NAME_PLACEHOLDER_ +
          '(haystack, needle, replacement) {',
       '  needle = ' +
           'needle.replace(/([-()\\[\\]{}+?*.$\\^|,:#<!\\\\])/g,"\\\\$1")',
       '                 .replace(/\\x08/g,"\\\\x08");',
       '  return haystack.replace(new RegExp(needle, \'g\'), replacement);',
       '}']);
  var code = functionName + '(' + text + ', ' + from + ', ' + to + ')';
  return [code, Blockly.Clang.ORDER_MEMBER];
};

Blockly.Clang['text_reverse'] = function(block) {
  var text = Blockly.Clang.valueToCode(block, 'TEXT',
      Blockly.Clang.ORDER_MEMBER) || '\'\'';
  var code = text + '.split(\'\').reverse().join(\'\')';
  return [code, Blockly.Clang.ORDER_MEMBER];
};

/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating JavaScript for variable blocks.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Clang.variables');

goog.require('Blockly.Clang');


Blockly.Clang['variables_get'] = function(block) {
  // Variable getter.
  var code = Blockly.Clang.variableDB_.getName(block.getFieldValue('VAR'),
      Blockly.VARIABLE_CATEGORY_NAME);
  return [code, Blockly.Clang.ORDER_ATOMIC];
};

Blockly.Clang['variables_set'] = function(block) {
  // Variable setter.
  var argument0 = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_ASSIGNMENT) || '0';
  var varName = Blockly.Clang.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  return varName + ' = ' + argument0 + ';\n';
};

//dev-variable


Blockly.Clang['data_variable'] = function(block) {
  // Variable getter.
  var code = Blockly.Clang.variableDB_.getName(block.getFieldValue('VARIABLE'),
      Blockly.VARIABLE_CATEGORY_NAME);
  return [code, Blockly.Clang.ORDER_ATOMIC];
};

Blockly.Clang['data_setvariableto'] = function(block) {
  // Variable setter.
  var argument0 = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_ASSIGNMENT) || '0';

  var varName = block.getFieldValue('VARIABLE');
  var code = '';

  if (varName) {
    varName = Blockly.Clang.variableDB_.getName(varName, Blockly.VARIABLE_CATEGORY_NAME);

    argument0 = Blockly.Clang.trimQuote(argument0);

    code =  varName + ' = ' + argument0 + ';\n';
  }

  return code;
};


Blockly.Clang['data_changevariableby'] = function(block) {
  // Variable setter.
  var argument0 = Blockly.Clang.valueToCode(block, 'VALUE',
      Blockly.Clang.ORDER_ASSIGNMENT) || '0';
  var varName = block.getFieldValue('VARIABLE');
  var code = '';
  if (varName) {
    varName = Blockly.Clang.variableDB_.getName(varName, Blockly.VARIABLE_CATEGORY_NAME);
    code =  varName + ' += ' + argument0 + ';\n';
  }

  return code;
};

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

/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
