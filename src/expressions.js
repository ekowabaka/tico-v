import { helpers } from "./ticoview.js";

// Tokenizer
export class Tokenizer {
    constructor(str) {
        this.str = str;
        this.cursor = 0;
    }

    tokenize() {
        const tokens = [];
        while (this.cursor < this.str.length) {
            const char = this.str[this.cursor];

            if (/\s/.test(char)) {
                this.cursor++;
                continue;
            }

            // String literals
            if (char === '"' || char === "'") {
                const quote = char;
                let value = '';
                this.cursor++; // Skip open quote
                while (this.cursor < this.str.length && this.str[this.cursor] !== quote) {
                    if (this.str[this.cursor] === '\\') {
                        this.cursor++;
                        value += this.str[this.cursor];
                    } else {
                        value += this.str[this.cursor];
                    }
                    this.cursor++;
                }
                this.cursor++; // Skip close quote
                tokens.push({ type: 'STRING', value });
                continue;
            }

            // Numbers
            if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(this.str[this.cursor + 1]))) {
                let value = '';
                while (this.cursor < this.str.length && /[0-9.]/.test(this.str[this.cursor])) {
                    value += this.str[this.cursor];
                    this.cursor++;
                }
                tokens.push({ type: 'NUMBER', value: parseFloat(value) });
                continue;
            }

            // Parentheses and Comma
            if (char === '(') {
                tokens.push({ type: 'LPAREN' });
                this.cursor++;
                continue;
            }
            if (char === ')') {
                tokens.push({ type: 'RPAREN' });
                this.cursor++;
                continue;
            }
            if (char === ',') {
                tokens.push({ type: 'COMMA' });
                this.cursor++;
                continue;
            }

            // Operators (Multi-character check first)
            const remaining = this.str.slice(this.cursor);
            if (remaining.startsWith('===')) {
                tokens.push({ type: 'OPERATOR', value: '===' });
                this.cursor += 3;
                continue;
            }
            if (remaining.startsWith('!==')) {
                tokens.push({ type: 'OPERATOR', value: '!==' });
                this.cursor += 3;
                continue;
            }
            if (remaining.startsWith('==')) {
                tokens.push({ type: 'OPERATOR', value: '==' });
                this.cursor += 2;
                continue;
            }
            if (remaining.startsWith('!=')) {
                tokens.push({ type: 'OPERATOR', value: '!=' });
                this.cursor += 2;
                continue;
            }
            if (remaining.startsWith('&&')) {
                tokens.push({ type: 'OPERATOR', value: '&&' });
                this.cursor += 2;
                continue;
            }
            if (remaining.startsWith('||')) {
                tokens.push({ type: 'OPERATOR', value: '||' });
                this.cursor += 2;
                continue;
            }
            if (remaining.startsWith('<=')) {
                tokens.push({ type: 'OPERATOR', value: '<=' });
                this.cursor += 2;
                continue;
            }
            if (remaining.startsWith('>=')) {
                tokens.push({ type: 'OPERATOR', value: '>=' });
                this.cursor += 2;
                continue;
            }

            // Single character operators
            if ('+-*/!?<>:'.includes(char)) {
                tokens.push({ type: 'OPERATOR', value: char });
                this.cursor++;
                continue;
            }

            // Identifiers (Variables, booleans, functions)
            if (/[a-zA-Z_$]/.test(char)) {
                let value = '';
                while (this.cursor < this.str.length && /[a-zA-Z0-9_$]/.test(this.str[this.cursor])) {
                    value += this.str[this.cursor];
                    this.cursor++;
                }
                if (value === 'true') {
                    tokens.push({ type: 'BOOLEAN', value: true });
                } else if (value === 'false') {
                    tokens.push({ type: 'BOOLEAN', value: false });
                } else {
                    tokens.push({ type: 'IDENTIFIER', value });
                }
                continue;
            }

            throw new Error(`Unexpected character: ${char} at position ${this.cursor}`);
        }
        return tokens;
    }
}

// AST Parser
export class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.index = 0;
    }

    peek() {
        return this.tokens[this.index];
    }

    next() {
        return this.tokens[this.index++];
    }

    parse() {
        if (!this.tokens || this.tokens.length === 0) {
            return { type: 'Literal', value: '' };
        }
        const expr = this.parseExpression();
        if (this.index < this.tokens.length) {
            throw new Error(`Unexpected extra tokens after valid expression parsing`);
        }
        return expr;
    }

    parseExpression() {
        return this.parseTernary();
    }

    parseTernary() {
        let left = this.parseLogicalOr();
        const token = this.peek();
        if (token && token.type === 'OPERATOR' && token.value === '?') {
            this.next(); // Consume '?'
            const consequent = this.parseExpression();
            let alternate;
            const nextToken = this.peek();
            if (nextToken && nextToken.type === 'OPERATOR' && nextToken.value === ':') {
                this.next(); // Consume ':'
                alternate = this.parseExpression();
            } else {
                // Shorthand ternary: cond ? expr (defaults alternate to empty string)
                alternate = { type: 'Literal', value: '' };
            }
            return {
                type: 'ConditionalExpression',
                test: left,
                consequent,
                alternate
            };
        }
        return left;
    }

    parseLogicalOr() {
        let left = this.parseLogicalAnd();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OPERATOR' && token.value === '||') {
                this.next();
                const right = this.parseLogicalAnd();
                left = { type: 'BinaryExpression', operator: '||', left, right };
            } else {
                break;
            }
        }
        return left;
    }

    parseLogicalAnd() {
        let left = this.parseEquality();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OPERATOR' && token.value === '&&') {
                this.next();
                const right = this.parseEquality();
                left = { type: 'BinaryExpression', operator: '&&', left, right };
            } else {
                break;
            }
        }
        return left;
    }

    parseEquality() {
        let left = this.parseRelational();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OPERATOR' && ['===', '!==', '==', '!='].includes(token.value)) {
                this.next();
                const right = this.parseRelational();
                left = { type: 'BinaryExpression', operator: token.value, left, right };
            } else {
                break;
            }
        }
        return left;
    }

    parseRelational() {
        let left = this.parseAdditive();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OPERATOR' && ['<', '>', '<=', '>='].includes(token.value)) {
                this.next();
                const right = this.parseAdditive();
                left = { type: 'BinaryExpression', operator: token.value, left, right };
            } else {
                break;
            }
        }
        return left;
    }

    parseAdditive() {
        let left = this.parseMultiplicative();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OPERATOR' && ['+', '-'].includes(token.value)) {
                this.next();
                const right = this.parseMultiplicative();
                left = { type: 'BinaryExpression', operator: token.value, left, right };
            } else {
                break;
            }
        }
        return left;
    }

    parseMultiplicative() {
        let left = this.parseUnary();
        while (true) {
            const token = this.peek();
            if (token && token.type === 'OPERATOR' && ['*', '/'].includes(token.value)) {
                this.next();
                const right = this.parseUnary();
                left = { type: 'BinaryExpression', operator: token.value, left, right };
            } else {
                break;
            }
        }
        return left;
    }

    parseUnary() {
        const token = this.peek();
        if (token && token.type === 'OPERATOR' && ['!', '-', '+'].includes(token.value)) {
            this.next();
            const argument = this.parseUnary();
            return { type: 'UnaryExpression', operator: token.value, argument };
        }
        return this.parsePrimary();
    }

    parsePrimary() {
        const token = this.next();
        if (!token) {
            throw new Error(`Unexpected end of input`);
        }

        if (token.type === 'STRING' || token.type === 'NUMBER' || token.type === 'BOOLEAN') {
            return { type: 'Literal', value: token.value };
        }

        if (token.type === 'IDENTIFIER') {
            const node = { type: 'Identifier', name: token.value };
            const nextToken = this.peek();
            if (nextToken && nextToken.type === 'LPAREN') {
                this.next(); // Consume '('
                const args = [];
                if (this.peek() && this.peek().type !== 'RPAREN') {
                    args.push(this.parseExpression());
                    while (this.peek() && this.peek().type === 'COMMA') {
                        this.next(); // Consume ','
                        args.push(this.parseExpression());
                    }
                }
                const closing = this.next();
                if (!closing || closing.type !== 'RPAREN') {
                    throw new Error(`Expected matching ')'`);
                }
                return { type: 'CallExpression', callee: node, arguments: args };
            }
            return node;
        }

        if (token.type === 'LPAREN') {
            const expr = this.parseExpression();
            const closing = this.next();
            if (!closing || closing.type !== 'RPAREN') {
                throw new Error(`Expected matching ')'`);
            }
            return expr;
        }

        throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    }
}

// AST Evaluator
export function evaluateAST(node, context) {
    if (!node) return undefined;
    switch (node.type) {
        case 'Literal':
            return node.value;

        case 'Identifier':
            if (helpers.has(node.name)) {
                return helpers.get(node.name);
            }
            if (context && node.name in context) {
                return context[node.name];
            }
            return undefined;

        case 'UnaryExpression':
            const arg = evaluateAST(node.argument, context);
            switch (node.operator) {
                case '!': return !arg;
                case '-': return -arg;
                case '+': return +arg;
                default: throw new Error(`Unsupported unary operator: ${node.operator}`);
            }

        case 'BinaryExpression':
            const left = evaluateAST(node.left, context);
            const right = evaluateAST(node.right, context);
            switch (node.operator) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return left / right;
                case '&&': return left && right;
                case '||': return left || right;
                case '===': return left === right;
                case '!==': return left !== right;
                case '==': return left == right;
                case '!=': return left != right;
                case '<': return left < right;
                case '>': return left > right;
                case '<=': return left <= right;
                case '>=': return left >= right;
                default: throw new Error(`Unsupported binary operator: ${node.operator}`);
            }

        case 'ConditionalExpression':
            const test = evaluateAST(node.test, context);
            return test ? evaluateAST(node.consequent, context) : evaluateAST(node.alternate, context);

        case 'CallExpression':
            const fn = evaluateAST(node.callee, context);
            if (typeof fn !== 'function') {
                throw new Error(`"${node.callee.name}" is not a registered helper or callable function.`);
            }
            const args = node.arguments.map(arg => evaluateAST(arg, context));
            return fn(...args);

        default:
            throw new Error(`Unsupported AST node: ${node.type}`);
    }
}

// Dependency Extractor
export function extractDependencies(node, dependencies = new Set()) {
    if (!node) return dependencies;
    if (node.type === 'Identifier') {
        if (!helpers.has(node.name)) {
            dependencies.add(node.name);
        }
    } else if (node.type === 'BinaryExpression') {
        extractDependencies(node.left, dependencies);
        extractDependencies(node.right, dependencies);
    } else if (node.type === 'UnaryExpression') {
        extractDependencies(node.argument, dependencies);
    } else if (node.type === 'ConditionalExpression') {
        extractDependencies(node.test, dependencies);
        extractDependencies(node.consequent, dependencies);
        extractDependencies(node.alternate, dependencies);
    } else if (node.type === 'CallExpression') {
        node.arguments.forEach(arg => extractDependencies(arg, dependencies));
    }
    return dependencies;
}

// Parse string expression to AST
export function parseExpressionString(str) {
    const tokenizer = new Tokenizer(str);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
}
