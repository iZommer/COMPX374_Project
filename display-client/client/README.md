# Display browser client

The `index.html`, `main.ts`, and `styles.css` files implement the kiosk UI. `main.ts` reads local server state and listens for Server-Sent Events; the browser never receives the saved Diary Server API key. Vite serves this directory in development and builds it to `display-client/dist/` for the Express server to serve in production.
