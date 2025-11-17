import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Login user using credentials from environment variables
 */
export async function login(page: Page) {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
  }

  // Go to login page
  await page.goto("/auth/login");

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // Listen for console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`Browser console error: ${msg.text()}`);
    }
  });

  // Fill in credentials - click first to ensure field is focused
  const emailField = page.getByPlaceholder("jan@example.com");
  const passwordField = page.getByPlaceholder("••••••••");

  await emailField.click();
  await emailField.fill(email);
  // Trigger input event to ensure React detects the change
  await emailField.dispatchEvent("input");

  await passwordField.click();
  await passwordField.fill(password);
  // Trigger input event to ensure React detects the change
  await passwordField.dispatchEvent("input");

  // Wait for the form to detect values and enable the button
  const loginButton = page.getByRole("button", { name: "Zaloguj się" });
  await loginButton.waitFor({ state: "visible", timeout: 5000 });

  // Wait for button to be enabled (give React time to update state)
  await expect(loginButton).toBeEnabled({ timeout: 2000 });

  await loginButton.click();

  // Wait for the button text to change to "Logowanie..." (loading state)
  // or for navigation to start - whichever comes first
  await Promise.race([
    page.waitForURL(/\/app\/.*/, { timeout: 10000 }),
    page.getByRole("button", { name: "Logowanie..." }).waitFor({ state: "visible", timeout: 2000 }),
  ]).catch(() => {
    // Ignore timeout - we'll check navigation below
  });

  // Wait for navigation to complete - either to app or preferences modal appears
  // Give it more time as Supabase auth might be slow
  try {
    // Wait for either URL change OR modal to appear
    await Promise.race([
      page.waitForURL(/\/app\/.*/, { timeout: 30000 }),
      page.getByRole("dialog").waitFor({ state: "visible", timeout: 30000 }),
    ]);
  } catch {
    // Check if we're still on login page without modal
    const currentUrl = page.url();
    const hasModal = await page
      .getByRole("dialog")
      .isVisible()
      .catch(() => false);

    console.log(`Current URL after login attempt: ${currentUrl}`);
    console.log(`Modal visible: ${hasModal}`);

    if (currentUrl.includes("/auth/login") && !hasModal) {
      // Take screenshot for debugging
      await page.screenshot({ path: "test-results/login-failed.png" }).catch(() => {
        // Ignore screenshot errors
      });
      throw new Error(`Login failed - check credentials. Still at ${currentUrl}`);
    }
  }

  await page.waitForLoadState("networkidle");

  // Skip preferences modal if it appears
  const skipButton = page.getByRole("button", { name: "Pomiń, uzupełnię później" });
  try {
    if (await skipButton.isVisible({ timeout: 3000 })) {
      console.log("Skipping preferences modal...");
      await skipButton.click();
      await page.waitForURL("/app/**", { timeout: 10000 });
      await page.waitForLoadState("networkidle");
    }
  } catch {
    // Modal nie pojawił się lub już został zamknięty - to OK
  }

  // Upewnijmy się że jesteśmy zalogowani sprawdzając czy jesteśmy w /app/**
  const currentUrl = page.url();
  if (!currentUrl.includes("/app/")) {
    throw new Error(`Login failed - not redirected to app. Current URL: ${currentUrl}`);
  }
}

/**
 * Logout the current user
 */
export async function logout(page: Page) {
  await page.goto("/auth/logout");
}
