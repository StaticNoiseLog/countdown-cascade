Has to be served to avoid CORS errors:
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at file:///main.js. (Reason: CORS request not http).

Browsers consider each "file:" source as a different origin, even when it is in the same directory.

You can avoid it by using a minimal web server:

cd /c/BK/IT/DEV/WEB/timer-app
python -m http.server


Software Architecture
=====================

Q: Can you explain why you create HTML elements like startButton programmatically in JavaScript instead of HTML?
Is this a philosophy that stems from React?

A: 
This is actually a common approach in vanilla JavaScript DOM manipulation, not specifically related to React. Let me explain the key reasons:

Dynamic Content Creation:
- The timers are created based on user input
- We don't know how many timers will exist beforehand
- Each timer needs unique event handlers and state

Component-like Organization
- While this isn't React, the approach is similar to component thinking
- Each timer is a self-contained unit with its own logic and event handlers
- The createTimerElement function acts like a component factory

State Management
- Each timer maintains its own state (running/paused, remaining time)
- The DOM elements need to be tightly coupled with their state
- Creating elements programmatically makes it easier to bind state and handlers

Event Handler Binding
- Each timer needs its own unique event handlers
- Creating elements in JS allows us to bind these handlers directly
- The handlers have access to closure variables specific to each timer

Here's a comparison to illustrate. This is our current approach:

```
const startButton = document.createElement('button');
startButton.className = 'btn-start';
startButton.textContent = '▶';
startButton.onclick = startTimer; // Direct access to timer-specific startTimer function
```

If we used HTML templates instead, it might look like this:

HTML:
```
<template id="timer-template">
  <div class="timer-item">
    <button class="btn-start" data-timer-id="???">▶</button>
  </div>
</template>
```

JavaScript:
```
// More complex code needed to find and bind handlers
const template = document.getElementById('timer-template');
const clone = template.content.cloneNode(true);
const button = clone.querySelector('.btn-start');
button.dataset.timerId = timer.id;
document.addEventListener('click', (e) => {
  if (e.target.matches('.btn-start')) {
    const timerId = e.target.dataset.timerId;
    const timer = findTimerById(timerId);
    // Now we need to recreate the context we had in the closure
    startTimer(timer);
  }
});
```

The HTML template approach would:

- Require more complex event delegation
- Make it harder to maintain timer-specific state
- Need additional data attributes to track relationships
- Lose the benefits of closure scope

While React solves these problems elegantly with its component model and virtual DOM, for vanilla JS applications, programmatically creating elements can be a cleaner solution when dealing with dynamic, stateful UI elements.