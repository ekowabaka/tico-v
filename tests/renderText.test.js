/** @jest-environment jsdom */
import { DomManipulators } from '../src/manipulators.js';

describe('renderText (implicit tests)', () => {
    // Helper to test renderText implicitly using TextNodeManipulator
    function testImplicitRender(structure, data) {
        const textNode = document.createTextNode('');
        const variables = new Map();
        
        // Mock a variable entry for DomManipulators.create
        // We use a dummy variable name 'testVar'
        variables.set('testVar', [{
            type: 'text',
            node: textNode,
            structure: structure
        }]);

        const manipulatorsMap = DomManipulators.create(variables);
        const manipulators = manipulatorsMap.get('testVar');
        
        // Execute the update method which internally calls renderText
        manipulators[0].update(data, textNode);
        
        return textNode.textContent;
    }

    it('should render plain text correctly', () => {
        const structure = [{ type: 'txt', value: 'Hello World' }];
        const data = {};
        expect(testImplicitRender(structure, data)).toBe('Hello World');
    });

    it('should render variables correctly', () => {
        const structure = [
            { type: 'txt', value: 'Hello ' },
            { type: 'var', name: 'name' }
        ];
        const data = { name: 'John' };
        expect(testImplicitRender(structure, data)).toBe('Hello John');
    });

    it('should render cond correctly when var1 is true', () => {
        const structure = [{ type: 'cond', var1: 'a', var2: 'b' }];
        const data = { a: 'Value A', b: 'Value B' };
        expect(testImplicitRender(structure, data)).toBe('Value A');
    });

    it('should render cond correctly when var1 is false', () => {
        const structure = [{ type: 'cond', var1: 'a', var2: 'b' }];
        const data = { a: '', b: 'Value B' };
        expect(testImplicitRender(structure, data)).toBe('Value B');
    });

    it('should render condstr correctly when var1 is true', () => {
        const structure = [{ type: 'condstr', var1: 'a', var2: 'String Value' }];
        const data = { a: true };
        expect(testImplicitRender(structure, data)).toBe('String Value');
    });

    it('should render condstr correctly when var1 is false', () => {
        const structure = [{ type: 'condstr', var1: 'a', var2: 'String Value' }];
        const data = { a: false };
        expect(testImplicitRender(structure, data)).toBe('');
    });

    it('should render condstrelse correctly when var1 is true', () => {
        const structure = [{ type: 'condstrelse', var1: 'a', var2: 'True String', var3: 'False String' }];
        const data = { a: true };
        expect(testImplicitRender(structure, data)).toBe('True String');
    });

    it('should render condstrelse correctly when var1 is false', () => {
        const structure = [{ type: 'condstrelse', var1: 'a', var2: 'True String', var3: 'False String' }];
        const data = { a: false };
        expect(testImplicitRender(structure, data)).toBe('False String');
    });

    it('should render complex structures correctly', () => {
        const structure = [
            { type: 'txt', value: 'User ' },
            { type: 'var', name: 'username' },
            { type: 'txt', value: ' is ' },
            { type: 'condstrelse', var1: 'isActive', var2: 'online', var3: 'offline' },
            { type: 'txt', value: '. Priority: ' },
            { type: 'cond', var1: 'priority', var2: 'defaultPriority' }
        ];
        
        const data = {
            username: 'Alice',
            isActive: true,
            priority: 'High',
            defaultPriority: 'Low'
        };
        expect(testImplicitRender(structure, data)).toBe('User Alice is online. Priority: High');

        const data2 = {
            username: 'Bob',
            isActive: false,
            priority: '',
            defaultPriority: 'Low'
        };
        expect(testImplicitRender(structure, data2)).toBe('User Bob is offline. Priority: Low');
    });
});
