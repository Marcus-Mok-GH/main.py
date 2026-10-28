const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const BrowserAgent = require('./agent'); // Require BrowserAgent

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Serve static files from the 'public' directory
app.use(express.static(PUBLIC_DIR));

// Basic route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected');
    const agent = new BrowserAgent(); // Create a new BrowserAgent for each client
    let busy = false;

    socket.on('action', async (data = {}) => {
        const { command, args } = data || {};
        const safeArgs = Array.isArray(args) ? args : [];
        console.log(`Received action: ${command} with args: ${JSON.stringify(safeArgs)}`);

        if (!agent.isToolCommand(command)) {
            console.error(`Invalid command: ${command}`);
            socket.emit('action_error', `Invalid command: ${command}`);
            return;
        }

        if (busy) {
            socket.emit('action_error', 'Another action is still running. Please wait.');
            return;
        }

        if (command !== 'init_browser' && !agent.page) {
            console.error('Browser not initialized. Client should call init_browser first.');
            socket.emit('action_error', 'Browser not initialized. Call init_browser first.');
            return;
        }

        busy = true;
        try {
            await agent.invoke(command, safeArgs);

            const screenshot = await agent.get_screenshot();
            const commandExecuted = `${command}(${safeArgs.map((arg) => JSON.stringify(arg)).join(', ')})`;

            socket.emit('action_response', {
                reasoning: '[PLACEHOLDER REASONING]',
                command_executed: commandExecuted,
                screenshot: screenshot,
                grid: [] // Simplified grid
            });
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            socket.emit('action_error', `Error executing command ${command}: ${error.message}`);
        } finally {
            busy = false;
        }
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected');
        try {
            await agent.close_browser(); // Clean up browser agent on disconnect
        } catch (error) {
            console.error('Error while closing browser on disconnect:', error);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
