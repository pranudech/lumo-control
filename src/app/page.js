'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";

export default function Home() {
  const [device, setDevice] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [commands, setCommands] = useState([]);
  const [forwardValue, setForwardValue] = useState('1.0');
  const [rightValue, setRightValue] = useState('1.0');
  const [leftValue, setLeftValue] = useState('1.0');

  const serviceUuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  const characteristicUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  const updateConnectionStatus = (isConnected) => {
    if (isConnected) {
      setConnectionStatus('Connected');
      setStatus('Connected');
    } else {
      setConnectionStatus('Disconnected');
      setStatus('Disconnected');
    }
  };

  const handleConnect = async () => {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API is not supported in your browser. Please use Chrome.');
      }

      if (device) {
        await device.gatt.disconnect();
        return;
      }

      const newDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [serviceUuid]
      });

      newDevice.addEventListener('gattserverdisconnected', onDisconnected);
      
      const server = await newDevice.gatt.connect();
      const service = await server.getPrimaryService(serviceUuid);
      const newCharacteristic = await service.getCharacteristic(characteristicUuid);

      setDevice(newDevice);
      setCharacteristic(newCharacteristic);
      updateConnectionStatus(true);
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
      setStatus(errorMessage);
      updateConnectionStatus(false);
    }
  };

  const onDisconnected = () => {
    setDevice(null);
    setCharacteristic(null);
    setStatus('Disconnected');
    updateConnectionStatus(false);
    setCommands([]);
  };

  const addCommand = (command, value) => {
    const fullCommand = `${command}${value}`;
    if (!commands.includes(fullCommand)) {
      setCommands([...commands, fullCommand]);
    }
  };

  const sendAllCommands = async () => {
    if (!characteristic) {
      setStatus('Not connected');
      return;
    }

    if (commands.length === 0) {
      setStatus('No commands to send');
      return;
    }

    try {
      const encoder = new TextEncoder();
      const fullCommand = commands.join('-');
      await characteristic.writeValue(encoder.encode(fullCommand));
      setStatus(`Sent: ${fullCommand}`);
      setCommands([]);
    } catch (error) {
      console.error('Error sending commands:', error);
      setStatus('Failed to send commands');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#2196F3] mb-4">LUMO Control</h1>
          <div className={`p-4 rounded-xl text-xl ${
            status === 'Connected' ? 'bg-[#d4edda]' : 
            status.includes('failed') ? 'bg-[#f8d7da]' : 'bg-[#f8f9fa]'
          }`}>
            {status}
          </div>
        </div>

        <div className="bg-[#f8f9fa] p-6 rounded-xl mb-8">
          <h2 className="text-2xl font-bold text-[#2196F3] mb-4 text-center">Command Preview</h2>
          <div className="text-xl mb-4 text-center min-h-8">
            {commands.length > 0 ? commands.join(' - ') : 'No commands selected'}
          </div>
          <button
            onClick={sendAllCommands}
            disabled={!device || commands.length === 0}
            className="w-full bg-[#FF5722] text-white py-6 px-12 text-2xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            START
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center gap-4">
            <input
              type="number"
              value={forwardValue}
              onChange={(e) => setForwardValue(e.target.value)}
              className="w-full p-4 text-xl border-2 border-gray-200 rounded-xl focus:border-[#2196F3] focus:outline-none focus:ring-2 focus:ring-[#2196F3] focus:ring-opacity-10"
              step="0.1"
              min="0"
              max="10"
            />
            <button
              onClick={() => addCommand('F', forwardValue)}
              disabled={!device}
              className="w-full h-48 bg-[#2196F3] text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center"
            >
              F
            </button>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <input
              type="number"
              value={rightValue}
              onChange={(e) => setRightValue(e.target.value)}
              className="w-full p-4 text-xl border-2 border-gray-200 rounded-xl focus:border-[#2196F3] focus:outline-none focus:ring-2 focus:ring-[#2196F3] focus:ring-opacity-10"
              step="0.1"
              min="0"
              max="10"
            />
            <button
              onClick={() => addCommand('RR', rightValue)}
              disabled={!device}
              className="w-full h-48 bg-[#2196F3] text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center"
            >
              RR
            </button>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <input
              type="number"
              value={leftValue}
              onChange={(e) => setLeftValue(e.target.value)}
              className="w-full p-4 text-xl border-2 border-gray-200 rounded-xl focus:border-[#2196F3] focus:outline-none focus:ring-2 focus:ring-[#2196F3] focus:ring-opacity-10"
              step="0.1"
              min="0"
              max="10"
            />
            <button
              onClick={() => addCommand('LR', leftValue)}
              disabled={!device}
              className="w-full h-48 bg-[#2196F3] text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center"
            >
              LR
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-8 bg-white p-4 rounded-xl shadow-lg">
        <button
          onClick={handleConnect}
          className="bg-[#4CAF50] text-white py-4 px-8 text-xl rounded-xl hover:translate-y-[-2px] hover:shadow-lg transition-all"
        >
          {device ? 'Disconnect' : 'Connect to LUMO'}
        </button>
        <div className={`mt-4 p-2 rounded-xl text-center ${
          connectionStatus === 'Connected' ? 'bg-[#d4edda]' : 'bg-[#f8f9fa]'
        }`}>
          {connectionStatus}
        </div>
      </div>
    </div>
  );
}
