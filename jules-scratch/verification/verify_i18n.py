from playwright.sync_api import sync_playwright, expect, TimeoutError
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/", timeout=60000)
        page.wait_for_load_state('networkidle')
        time.sleep(3)

        # Use a more robust locator for the login button
        login_button = page.get_by_role("button", name="INGRESAR")
        expect(login_button).to_be_visible(timeout=10000)
        login_button.click()

        # Wait for the modal to appear
        modal = page.locator(".v-dialog--active")
        expect(modal).to_be_visible(timeout=10000)

        # Change language to English
        page.locator('button:has([class*="mdi-translate"])').click()
        page.locator("text=English").click()

        # Take a screenshot of the login modal in English
        page.screenshot(path="jules-scratch/verification/verification.png")

    except TimeoutError as e:
        print(f"Timeout error: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)