document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const commandInput = document.getElementById('commandInput');
    const sendCommandButton = document.getElementById('sendCommandButton');
    const actionInfo = document.getElementById('actionInfo');
    const screenshotImage = document.getElementById('screenshotImage');

    // Automatically send init_browser command on connect as per subtask instructions
    // (though the problem statement says "client will send init_browser as the first action")
    // This can be changed to be more explicit if needed.
    socket.on('connect', () => {
        console.log('Connected to server. Initializing browser...');
        socket.emit('action', { command: 'init_browser', args: [] });
    });

    sendCommandButton.addEventListener('click', () => {
        const fullCommand = commandInput.value.trim();
        if (!fullCommand) {
            alert('Please enter a command.');
            return;
        }

        const parts = fullCommand.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        if (parts.length === 0) {
            alert('Invalid command format.');
            return;
        }
        
        const command = parts[0];
        // Strip surrounding quotes and coerce unquoted numeric arguments (e.g. mouse coordinates)
        const args = parts.slice(1).map((arg) => {
            const quoted = arg.length >= 2 && arg.startsWith('"') && arg.endsWith('"');
            const value = quoted ? arg.slice(1, -1) : arg;
            if (!quoted && value !== '' && !Number.isNaN(Number(value))) {
                return Number(value);
            }
            return value;
        });

        console.log(`Sending action: ${command} with args:`, args);
        actionInfo.textContent = `Running ${command}...`;
        socket.emit('action', { command, args });
        commandInput.value = ''; // Clear input after sending
    });

    // Allow pressing Enter to send a command.
    commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendCommandButton.click();
        }
    });

    function showScreenshot(base64Data) {
        if (!base64Data) {
            screenshotImage.removeAttribute('src');
            screenshotImage.style.display = 'none';
            return;
        }
        screenshotImage.src = `data:image/png;base64,${base64Data}`;
        screenshotImage.style.display = 'block';
    }

    socket.on('action_response', (data) => {
        console.log('Received action_response:', data);
        actionInfo.textContent = `Reasoning: ${data.reasoning}\nCommand Executed: ${data.command_executed}`;
        if (data.screenshot) {
            screenshotImage.alt = 'Current browser screenshot';
            showScreenshot(data.screenshot);
        } else {
            screenshotImage.alt = 'No screenshot available.';
            showScreenshot(null);
        }
        // console.log('Grid data (simplified):', data.grid);
    });

    socket.on('action_error', (errorMessage) => {
        console.error('Action Error:', errorMessage);
        actionInfo.textContent = `Error: ${errorMessage}`;
        screenshotImage.alt = 'Error occurred. No screenshot available.';
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        actionInfo.textContent = 'Disconnected from server. Please refresh.';
        screenshotImage.alt = 'Disconnected. No screenshot available.';
        showScreenshot(null);
    });
});
