let device = null;
let characteristic = null;
const serviceUuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'; // ESP32 default service UUID
const characteristicUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'; // ESP32 default characteristic UUID

const connectBtn = document.getElementById('connectBtn');
const forwardBtn = document.getElementById('forwardBtn');
const rightBtn = document.getElementById('rightBtn');
const leftBtn = document.getElementById('leftBtn');
const statusDiv = document.getElementById('status');
const connectionStatus = document.getElementById('connectionStatus');
const commandList = document.getElementById('commandList');
const startBtn = document.getElementById('startBtn');

// Get input elements
const forwardValue = document.getElementById('forwardValue');
const rightValue = document.getElementById('rightValue');
const leftValue = document.getElementById('leftValue');

let commands = [];

function updateConnectionStatus(isConnected) {
    if (isConnected) {
        connectionStatus.textContent = 'Connected';
        connectionStatus.style.backgroundColor = '#d4edda';
        connectBtn.textContent = 'Disconnect';
    } else {
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.style.backgroundColor = '#f8f9fa';
        connectBtn.textContent = 'Connect to PUMO';
    }
}

connectBtn.addEventListener('click', async () => {
    try {
        if (!navigator.bluetooth) {
            throw new Error('Web Bluetooth API is not supported in your browser. Please use Chrome.');
        }

        if (device) {
            // Disconnect if already connected
            await device.gatt.disconnect();
            return;
        }

        device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [serviceUuid]
        });

        device.addEventListener('gattserverdisconnected', onDisconnected);
        
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(serviceUuid);
        characteristic = await service.getCharacteristic(characteristicUuid);

        statusDiv.textContent = 'Connected';
        statusDiv.style.backgroundColor = '#d4edda';
        updateConnectionStatus(true);
        [forwardBtn, rightBtn, leftBtn].forEach(btn => btn.disabled = false);
        startBtn.disabled = false;
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = 'Connection failed: ';
        if (error.message.includes('User cancelled')) {
            errorMessage += 'Please select your ESP32 device';
        } else if (error.message.includes('not found')) {
            errorMessage += 'ESP32 not found. Make sure it is powered on and in range';
        } else if (error.message.includes('Web Bluetooth API')) {
            errorMessage += 'Please use Chrome browser';
        } else {
            errorMessage += error.message;
        }
        statusDiv.textContent = errorMessage;
        statusDiv.style.backgroundColor = '#f8d7da';
        updateConnectionStatus(false);
    }
});

function onDisconnected() {
    device = null;
    characteristic = null;
    statusDiv.textContent = 'Disconnected';
    statusDiv.style.backgroundColor = '#f8f9fa';
    updateConnectionStatus(false);
    [forwardBtn, rightBtn, leftBtn].forEach(btn => btn.disabled = true);
    startBtn.disabled = true;
    commands = [];
    updateCommandList();
}

function addCommand(command, value) {
    const fullCommand = `${command}${value}`;
    if (!commands.includes(fullCommand)) {
        commands.push(fullCommand);
        updateCommandList();
    }
}

function updateCommandList() {
    if (commands.length === 0) {
        commandList.textContent = 'No commands selected';
        commandList.style.color = '#666';
    } else {
        commandList.textContent = commands.join(' - ');
        commandList.style.color = '#2c3e50';
    }
}

async function sendAllCommands() {
    if (!characteristic) {
        statusDiv.textContent = 'Not connected';
        return;
    }

    if (commands.length === 0) {
        statusDiv.textContent = 'No commands to send';
        return;
    }

    try {
        const encoder = new TextEncoder();
        const fullCommand = commands.join('-');
        await characteristic.writeValue(encoder.encode(fullCommand));
        statusDiv.textContent = `Sent: ${fullCommand}`;
        commands = [];
        updateCommandList();
    } catch (error) {
        console.error('Error sending commands:', error);
        statusDiv.textContent = 'Failed to send commands';
    }
}

forwardBtn.addEventListener('click', () => addCommand('F', forwardValue.value));
rightBtn.addEventListener('click', () => addCommand('RR', rightValue.value));
leftBtn.addEventListener('click', () => addCommand('LR', leftValue.value));
startBtn.addEventListener('click', sendAllCommands); 