const { Parser } = require('expr-eval');

const parser = new Parser();
const expr = parser.parse('framework=="react" ? "tsx" : "ts"');
console.log(expr.evaluate({ framework: "react" }));
