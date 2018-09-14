tiCo-v
====
tiCo-v provides a lightweight solution for templating and one-way data-binding in JavaScript. Built on top of ES6 proxies, tiCo-v provides a very thin layer of code to update DOM elements when the associated bound objects are updated and nothing more.

Installation
------------
Currently, the only supported package managers are either `npm` or `composer`. If you do not use any of these, you can always download the current version of the script and load directly into your markup.

For `npm` ...

    npm install tico-v

For `composer`
    
    composer require ekowabaka/tico-v

There are currently no dependencies required for tiCo-v. Feel free to include the tiCo-v script directly into your markup.

````html
<script src='assets/tico-v.min.js'></script>
````


Using tiCo-v
------------

### Writing Templates
Templates for tiCo-v are written directly into the html markup. Variables to be replaced by later bindings are written with the mustache/handlebars style variable placeholder.

````html
<div>
    <span id='firstname'>{{firstname}}</span>
    <span id='lastname'>{{lastname}}</span>
</div>
````

### Binding Variables

### tv Attributes

### Loops
