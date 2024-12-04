Changelog
=========
Unreleased 
----------
- Fixes a bug that prevents ticoview from working in Safari and other webkit based browsers (like Gnome Web).
- Fixes a bug that causes ticoview to crash when a variable being changed has no corresponding DOM elements to manipulate.

2024-10-31 - v0.4.1
-------------------
- Fixes wrong `package.json` entry.

2024-10-31 - v0.4.0
-------------------
- Adds a new tag, `tv-set`, for setting boolean attributes (like hidden and checked) on elements.
- Adds a main entry in `package.json` to allow easy imports in other scripts when needed.
- Fixes bugs in the `tv-foreach` tag, which made the output of pages with multiple foreach elements inconsistent.

2024-10-22 - v0.3.2
-------------------
- Adds correct build artifacts.

2024-10-22 - v0.3.1
-------------------
- Fixes bugs which prevents elements with foreach attributes from having other variables.
- Refactored the parsing code to make it cleaner and easier to follow.

2024-10-20 - v0.3.0
-------------------
- Adds a distributable webpack build that can be embedded directly into HTML pages.
- Adds more unit testing.

2024-10-16 - v0.2.0
-------------------
- Adds unit testing to make code base a bit more robust.
- Fixes an issue with assigning values to arrays.

2018-09-15 - v0.1.0
-------------------
- Initial release