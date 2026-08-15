import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // We increase timeouts since it's a dev environment and sometimes local servers take a moment
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    supportFile: false,
  },
});
