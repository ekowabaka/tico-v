/**
 * @jest-environment jsdom
 */

import { DomParser } from "../src/parsers.js";
import { bind, registerHelper } from "../src/ticoview.js";

const layout = `<!DOCTYPE html>
    <html>
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper">%s</div>
        </body>
    </html>`;

test("evaluate complex arithmetic and string concatenation expressions", () => {
    document.body.innerHTML = layout.replace('%s',
        `<div id="target">{{ "Score: " + (score + extra * 10) }}</div>`
    );

    const view = bind('#wrapper');
    view.data = { score: 50, extra: 5 };

    const element = document.body.querySelector('#target');
    expect(element.textContent).toBe("Score: 100");

    // Test updates work correctly
    view.data.score = 70;
    expect(element.textContent).toBe("Score: 120");
});

test("evaluate complex boolean and comparison expressions", () => {
    document.body.innerHTML = layout.replace('%s',
        `<div id="target">{{ isMember && age >= 18 ? "Welcome VIP" : "Access Denied" }}</div>`
    );

    const view = bind('#wrapper');
    view.data = { isMember: true, age: 20 };

    const element = document.body.querySelector('#target');
    expect(element.textContent).toBe("Welcome VIP");

    view.data.age = 16;
    expect(element.textContent).toBe("Access Denied");

    view.data.isMember = false;
    view.data.age = 25;
    expect(element.textContent).toBe("Access Denied");
});

test("register and call helper functions in expressions", () => {
    registerHelper('shout', (str) => String(str).toUpperCase() + '!!!');
    registerHelper('addPrefix', (prefix, str) => prefix + str);

    document.body.innerHTML = layout.replace('%s',
        `<div id="target">{{ shout(addPrefix("User: ", username)) }}</div>`
    );

    const view = bind('#wrapper');
    view.data = { username: "ekow" };

    const element = document.body.querySelector('#target');
    expect(element.textContent).toBe("USER: EKOW!!!");

    view.data.username = "antigravity";
    expect(element.textContent).toBe("USER: ANTIGRAVITY!!!");
});

test("exclude registered helper names from dynamic dependency binding", () => {
    registerHelper('calc', (x) => x * 2);

    const domparser = new DomParser();
    document.body.innerHTML = layout.replace('%s',
        `<div>{{ calc(myVal) + extra }}</div>`
    );

    const variables = domparser.parse(document.body.querySelector('#wrapper'));
    // Dynamic dependencies should only contain 'myVal' and 'extra', but NOT 'calc'
    expect(variables.has('myVal')).toBe(true);
    expect(variables.has('extra')).toBe(true);
    expect(variables.has('calc')).toBe(false);
});
