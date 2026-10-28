const BrowserAgent = require('./agent');
const puppeteer = require('puppeteer');

// Mock puppeteer
jest.mock('puppeteer');

describe('BrowserAgent', () => {
    let agent;
    let mockPage;
    let mockBrowser;

    beforeEach(() => {
        agent = new BrowserAgent();

        // Setup mock page and browser
        mockPage = {
            goto: jest.fn(),
            mouse: {
                click: jest.fn(),
                move: jest.fn(), // Added for completeness, though mouse_move is a placeholder
            },
            keyboard: {
                type: jest.fn(),
                press: jest.fn(),
            },
            screenshot: jest.fn().mockResolvedValue('mocked_screenshot_data'),
            close: jest.fn(),
        };
        mockBrowser = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn(),
        };
        puppeteer.launch.mockResolvedValue(mockBrowser);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('init_browser', () => {
        it('should launch puppeteer, create a new page, and store browser and page instances', async () => {
            await agent.init_browser();
            expect(puppeteer.launch).toHaveBeenCalledWith({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
            expect(agent.browser).toBe(mockBrowser);
            expect(agent.page).toBe(mockPage);
        });
    });

    describe('go_to', () => {
        it('should call page.goto with the correct URL', async () => {
            await agent.init_browser(); // Initialize page
            const url = 'https://example.com';
            await agent.go_to(url);
            expect(mockPage.goto).toHaveBeenCalledWith(url, { waitUntil: 'networkidle2' });
        });

        it('should log an error if page is not initialized', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await agent.go_to('https://example.com');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Page not initialized. Call init_browser() first.');
            consoleErrorSpy.mockRestore();
        });
    });

    describe('mouse_click', () => {
        it('should call page.mouse.click with the correct coordinates', async () => {
            await agent.init_browser();
            const x = 100;
            const y = 200;
            await agent.mouse_click(x, y);
            expect(mockPage.mouse.click).toHaveBeenCalledWith(x, y);
        });

        it('should log an error if page is not initialized', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await agent.mouse_click(100, 200);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Page not initialized.');
            consoleErrorSpy.mockRestore();
        });
    });
    
    describe('mouse_move', () => { // Testing the placeholder
        it('should log mouse move and not call puppeteer mouse.move', async () => {
            await agent.init_browser();
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            await agent.mouse_move(50, 50);
            expect(consoleLogSpy).toHaveBeenCalledWith('Mouse move to (50, 50) - placeholder');
            expect(mockPage.mouse.move).not.toHaveBeenCalled();
            consoleLogSpy.mockRestore();
        });
    });

    describe('type', () => {
        it('should call page.keyboard.type with the correct text', async () => {
            await agent.init_browser();
            const text = 'Hello, world!';
            await agent.type(text);
            expect(mockPage.keyboard.type).toHaveBeenCalledWith(text);
        });
         it('should log an error if page is not initialized', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await agent.type('test');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Page not initialized.');
            consoleErrorSpy.mockRestore();
        });
    });

    describe('press_key', () => {
        it('should call page.keyboard.press with the correct key', async () => {
            await agent.init_browser();
            const key = 'Enter';
            await agent.press_key(key);
            expect(mockPage.keyboard.press).toHaveBeenCalledWith(key);
        });
        it('should log an error if page is not initialized', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await agent.press_key('Enter');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Page not initialized.');
            consoleErrorSpy.mockRestore();
        });
    });

    describe('get_screenshot', () => {
        it('should call page.screenshot and return base64 data', async () => {
            await agent.init_browser();
            const screenshotData = await agent.get_screenshot();
            expect(mockPage.screenshot).toHaveBeenCalledWith({ encoding: 'base64' });
            expect(screenshotData).toBe('mocked_screenshot_data');
        });
        it('should log an error and return null if page is not initialized', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const result = await agent.get_screenshot();
            expect(consoleErrorSpy).toHaveBeenCalledWith('Page not initialized.');
            expect(result).toBeNull();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('close_browser', () => {
        it('should close the browser if it exists', async () => {
            await agent.init_browser();
            await agent.close_browser();
            expect(mockBrowser.close).toHaveBeenCalledTimes(1);
            expect(agent.browser).toBeNull();
            expect(agent.page).toBeNull();
        });

        it('should not throw an error if browser is not initialized', async () => {
            await expect(agent.close_browser()).resolves.not.toThrow();
        });
    });

    describe('isToolCommand', () => {
        it('should accept whitelisted tool commands', () => {
            expect(agent.isToolCommand('init_browser')).toBe(true);
            expect(agent.isToolCommand('go_to')).toBe(true);
            expect(agent.isToolCommand('get_screenshot')).toBe(true);
        });

        it('should reject unknown commands and internal methods', () => {
            expect(agent.isToolCommand('close_browser')).toBe(false);
            expect(agent.isToolCommand('invoke')).toBe(false);
            expect(agent.isToolCommand('constructor')).toBe(false);
            expect(agent.isToolCommand(undefined)).toBe(false);
        });
    });

    describe('invoke', () => {
        it('should run a whitelisted command with the provided args', async () => {
            await agent.invoke('init_browser', []);
            expect(puppeteer.launch).toHaveBeenCalledTimes(1);

            await agent.invoke('go_to', ['https://example.com']);
            expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle2' });
        });

        it('should throw for a command that is not whitelisted', async () => {
            await expect(agent.invoke('close_browser', [])).rejects.toThrow('Invalid command: close_browser');
        });

        it('should tolerate a missing args array', async () => {
            await agent.invoke('init_browser');
            expect(puppeteer.launch).toHaveBeenCalledTimes(1);
        });
    });
});
