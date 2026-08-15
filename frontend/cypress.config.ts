import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // Point to the running React dev server
    baseUrl: "http://localhost:3000",

    // Viewport that looks like a desktop browser
    viewportWidth: 1280,
    viewportHeight: 800,

    // Always record video & take screenshots on failure
    video: true,
    screenshotOnRunFailure: true,

    // Generous timeouts for the local dev environment
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 60000,
    requestTimeout: 15000,
    responseTimeout: 15000,

    // Slow Cypress down slightly so you can follow along in the browser
    animationDistanceThreshold: 5,

    // Don't auto-restart the runner when spec files change
    watchForFileChanges: false,

    // Only run our lifecycle test by default
    specPattern: "cypress/e2e/full_lifecycle.cy.ts",

    supportFile: false,

    setupNodeEvents(_on, _config) {
      // node-level event listeners can be added here
    },
  },
});
