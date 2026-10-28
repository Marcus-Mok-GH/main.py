const puppeteer = require('puppeteer');

// Commands that remote clients are allowed to invoke on a BrowserAgent.
// Keeping this list explicit prevents a client from calling arbitrary
// methods/properties (e.g. `constructor`, `invoke`) over the socket.
const TOOL_METHODS = Object.freeze([
    'init_browser',
    'go_to',
    'mouse_move',
    'mouse_click',
    'type',
    'press_key',
    'get_screenshot',
]);

class BrowserAgent {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    static get toolMethods() {
        return TOOL_METHODS;
    }

    /**
     * Returns true when `command` is a tool exposed to remote clients.
     * @param {string} command
     * @returns {boolean}
     */
    isToolCommand(command) {
        return typeof command === 'string' &&
            TOOL_METHODS.includes(command) &&
            typeof this[command] === 'function';
    }

    /**
     * Runs a whitelisted tool with logging and argument normalization.
     * @param {string} command
     * @param {Array} args
     */
    async invoke(command, args = []) {
        if (!this.isToolCommand(command)) {
            throw new Error(`Invalid command: ${command}`);
        }
        const safeArgs = Array.isArray(args) ? args : [];
        console.log(`Calling ${command} with args: ${JSON.stringify(safeArgs)}`);
        return this[command](...safeArgs);
    }

    async init_browser() {
        // Avoid leaking a previous browser instance if the client re-initializes.
        if (this.browser) {
            await this.close_browser();
        }
        this.browser = await puppeteer.launch({
            headless: true, // Set to false to see the browser, true for CI/server
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Args for running in restricted environments
        });
        this.page = await this.browser.newPage();
        console.log('Browser initialized and new page created.');
    }

    async go_to(url) {
        if (!this.page) {
            console.error('Page not initialized. Call init_browser() first.');
            return;
        }
        if (typeof url !== 'string' || url.trim() === '') {
            throw new Error('go_to requires a non-empty URL string.');
        }
        await this.page.goto(url, { waitUntil: 'networkidle2' });
        console.log(`Navigated to ${url}`);
    }

    async mouse_move(x, y) {
        if (!this.page) {
            console.error('Page not initialized.');
            return;
        }
        // For now, this is a placeholder as actual real-time mouse streaming is complex
        // await this.page.mouse.move(x, y);
        console.log(`Mouse move to (${x}, ${y}) - placeholder`);
    }

    async mouse_click(x, y) {
        if (!this.page) {
            console.error('Page not initialized.');
            return;
        }
        await this.page.mouse.click(x, y);
        console.log(`Mouse clicked at (${x}, ${y})`);
    }

    async type(text) {
        if (!this.page) {
            console.error('Page not initialized.');
            return;
        }
        await this.page.keyboard.type(text);
        console.log(`Typed text: ${text}`);
    }

    async press_key(key) {
        if (!this.page) {
            console.error('Page not initialized.');
            return;
        }
        await this.page.keyboard.press(key);
        console.log(`Pressed key: ${key}`);
    }

    async get_screenshot() {
        if (!this.page) {
            console.error('Page not initialized.');
            return null;
        }
        const screenshotBuffer = await this.page.screenshot({ encoding: 'base64' });
        console.log('Screenshot taken.');
        return screenshotBuffer;
    }

    async close_browser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('Browser closed.');
        }
    }
}

BrowserAgent.TOOL_METHODS = TOOL_METHODS;

module.exports = BrowserAgent;
