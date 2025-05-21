'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";

export default function Home() {
  const [device, setDevice] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [commands, setCommands] = useState([]);
  const [forwardValue, setForwardValue] = useState('2.9');
  const [rightValue, setRightValue] = useState('0.886');
  const [leftValue, setLeftValue] = useState('0.925');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [position, setPosition] = useState({ x: 0, y: 5 });
  const [direction, setDirection] = useState(0);
  const [showGridModal, setShowGridModal] = useState(false);

  const serviceUuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  const characteristicUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  useEffect(() => {
    // Initialize audio context on first user interaction
    const initAudio = () => {
      if (!audioContext) {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(context);
      }
    };

    // Add event listener for first user interaction
    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  const getCommandIcon = (command) => {
    if (!command) return null;

    const value = command.substring(1);
    const type = command[0];

    let bgColor = '';
    let imgSrc = '';
    let imgAlt = '';
    switch (type) {
      case 'F':
        bgColor = 'bg-[#98FB98]';
        imgSrc = '/images/F.png';
        imgAlt = 'F';
        break;
      case 'R':
        bgColor = 'bg-[#EEE8AA]';
        imgSrc = '/images/R.png';
        imgAlt = 'R';
        break;
      case 'L':
        bgColor = 'bg-[#FF9999]';
        imgSrc = '/images/L.png';
        imgAlt = 'L';
        break;
      default:
        return null;
    }

    return (
      <img src={imgSrc} alt={imgAlt} className="w-full h-full object-contain" />
    );
  };

  const updateConnectionStatus = (isConnected) => {
    if (isConnected) {
      setConnectionStatus('Connected');
      setStatus('Connected');
    } else {
      setConnectionStatus('Disconnected');
      setStatus('Disconnected');
    }
  };

  const playClickSound = () => {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set up the click sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const handleConnect = async () => {
    playClickSound();
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
    playClickSound();
    if (commands.length >= 12) {
      setStatus('Maximum 12 commands allowed');
      return;
    }
    const fullCommand = `${command}${value}`;
    setCommands([...commands, fullCommand]);
  };

  const removeCommand = (index) => {
    playClickSound();
    const newCommands = [...commands];
    newCommands.splice(index, 1);
    setCommands(newCommands);
  };

  const updatePosition = (command) => {
    const newPosition = { ...position };
    const newDirection = direction;

    switch (command) {
      case 'FT':
        switch (direction) {
          case 0: // ขึ้น
            if (newPosition.y > 0) newPosition.y--;
            break;
          case 1: // ขวา
            if (newPosition.x < 5) newPosition.x++;
            break;
          case 2: // ลง
            if (newPosition.y < 5) newPosition.y++;
            break;
          case 3: // ซ้าย
            if (newPosition.x > 0) newPosition.x--;
            break;
        }
        break;
      case 'RR':
        setDirection((direction + 1) % 4);
        break;
      case 'LR':
        setDirection((direction + 3) % 4);
        break;
    }

    setPosition(newPosition);
  };

  const sendAllCommands = async () => {
    playClickSound();
    
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
      
      // อัพเดทตำแหน่งตามคำสั่ง
      commands.forEach(cmd => {
        const commandType = cmd.substring(0, 2);
        updatePosition(commandType);
      });
      
      const timestamp = new Date().toLocaleString();
      setCommandHistory(prev => [...prev, {
        timestamp,
        commands: fullCommand
      }]);
      
      setStatus(`Sent: ${fullCommand}`);
      setCommands([]);
    } catch (error) {
      console.error('Error sending commands:', error);
      setStatus('Failed to send commands');
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 dark:from-blue-900 dark:via-cyan-900/20 dark:to-indigo-900">
      <div className="max-w-6xl mx-auto flex gap-8">
        {/* Main Content */}
        <div className="flex-1 bg-[#fdfdf7] dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 animate-fade-in border-4 border-blue-200/50 dark:border-cyan-700/50">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center justify-center gap-4 mb-4">
              <img src="/images/pumo-logo.png" alt="PUMO" className="h-30 animate-bounce" onClick={playClickSound} />
              <h5 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 bg-clip-text text-transparent animate-pulse">
                PUMO Control
              </h5>
            </div>
          </div>

          <div className="bg-blue-50/50 dark:bg-cyan-700/30 p-8 rounded-2xl mb-8 shadow-inner backdrop-blur-sm border-4 border-blue-200/50 dark:border-cyan-700/50">
            <h2 className="text-3xl text-blue-500 dark:text-cyan-400 mb-6 text-center flex items-center justify-center gap-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              ตารางโปรแกรมคำสั่ง
            </h2>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full bg-white/80 dark:bg-slate-800/80 p-6 rounded-xl shadow-sm border-4 border-blue-200/50 dark:border-cyan-700/50 min-h-[200px] flex items-center justify-center">
                <div className="grid grid-cols-6 gap-2 w-full">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={index}
                      className={`relative aspect-square rounded-lg border-2 ${commands[index]
                        ? 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-300 dark:border-cyan-500'
                        : 'bg-white/50 dark:bg-slate-700/50 border-blue-200 dark:border-cyan-700'
                        } flex items-center justify-center p-2`}
                    >
                      {commands[index] ? (
                        <>
                          <div className={`absolute inset-0 rounded-lg ${
                            commands[index][0] === 'F' ? 'bg-[#98FB98]' :
                            commands[index][0] === 'R' ? 'bg-[#EEE8AA]' :
                            commands[index][0] === 'L' ? 'bg-[#FF9999]' :
                            ''
                          }`}></div>
                          <div className="relative w-full h-full z-10 flex items-center justify-center">
                            {getCommandIcon(commands[index])}
                          </div>
                          <button
                            onClick={() => removeCommand(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-300 z-20"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <span className="text-blue-400 dark:text-cyan-500 text-sm">
                          ช่องที่ {index + 1}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={sendAllCommands}
                disabled={!device || commands.length === 0}
                className="w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex flex-col items-center justify-center gap-2 group animate-pulse"
              >
                <svg className="w-12 h-12 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-lg font-bold">เริ่ม</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            <div className="flex flex-col items-center gap-4 group">
              <button
                onClick={() => addCommand('LR', leftValue)}
                disabled={!device}
                className="w-full h-48 bg-gradient-to-br bg-[#FF9999] border text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center group"
              >
                <div className="transform group-hover:scale-110 transition-transform duration-300">
                  <img src="/images/L.png" alt="L" className="max-h-[192px]" />
                </div>
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 group">
              <button
                onClick={() => addCommand('FT', forwardValue)}
                disabled={!device}
                className="w-full h-48 bg-gradient-to-br bg-[#98FB98] border text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center group"
              >
                <div className="transform group-hover:scale-110 transition-transform duration-300">
                  <img src="/images/F.png" alt="Forward" className="max-h-[192px]" />
                </div>
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 group">
              <button
                onClick={() => addCommand('RR', rightValue)}
                disabled={!device}
                className="w-full h-48 bg-gradient-to-br bg-[#EEE8AA] border text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center group"
              >
                <div className="transform group-hover:scale-110 transition-transform duration-300">
                  <img src="/images/R.png" alt="R" className="max-h-[192px]" />
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* Connect Button */}
        <div className="fixed bottom-8 right-8 flex gap-4 items-end">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="max-w-[72px] max-h-[72px] cursor-pointer bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white p-4 rounded-full shadow-xl hover:translate-y-[-5px] hover:shadow-2xl transition-all duration-300 group"
          >
            <svg className="w-10 h-10 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <div className="flex flex-col items-center gap-2">
            <div className={`text-sm px-2 py-1 rounded-full transition-all duration-300 flex items-center gap-1 ${connectionStatus === 'Connected' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                'bg-blue-100 dark:bg-cyan-700/50 text-blue-700 dark:text-cyan-300'
              }`}>
              <svg className={`w-4 h-4 ${connectionStatus === 'Connected' ? 'text-green-500' : 'text-blue-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {connectionStatus === 'Connected' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              {connectionStatus}
            </div>

            <button
              onClick={() => setShowConnectModal(true)}
              className="cursor-pointer bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white p-4 rounded-full shadow-xl hover:translate-y-[-5px] hover:shadow-2xl transition-all duration-300 group"
            >
              <img src="/images/bluetooth.png" alt="Bluetooth" className="w-10 h-10 invert dark:invert-0" />
            </button>
          </div>
        </div>

        {/* Add Grid View Button to bottom left */}
        {/* <div className="fixed bottom-8 left-8">
          <button
            onClick={() => setShowGridModal(true)}
            className="max-w-[72px] max-h-[72px] cursor-pointer bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white p-4 rounded-full shadow-xl hover:translate-y-[-5px] hover:shadow-2xl transition-all duration-300 group"
          >
            <svg className="w-10 h-10 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        </div> */}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 backdrop-blur-sm border-4 border-blue-200/50 dark:border-cyan-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-500 dark:text-cyan-400">Settings</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-blue-400 hover:text-blue-600 dark:hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-blue-600 dark:text-cyan-400">Forward Value</label>
                  <input
                    type="number"
                    value={forwardValue}
                    onChange={(e) => setForwardValue(e.target.value)}
                    className="w-full p-4 text-xl border-4 border-blue-200 dark:border-cyan-600 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-blue-600 dark:text-cyan-400">Right Value</label>
                  <input
                    type="number"
                    value={rightValue}
                    onChange={(e) => setRightValue(e.target.value)}
                    className="w-full p-4 text-xl border-4 border-blue-200 dark:border-cyan-600 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-lg font-medium text-blue-600 dark:text-cyan-400">Left Value</label>
                  <input
                    type="number"
                    value={leftValue}
                    onChange={(e) => setLeftValue(e.target.value)}
                    className="w-full p-4 text-xl border-4 border-blue-200 dark:border-cyan-600 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connect Modal */}
        {showConnectModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 backdrop-blur-sm border-4 border-blue-200/50 dark:border-cyan-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-500 dark:text-cyan-400">Connection</h2>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="text-blue-400 hover:text-blue-600 dark:hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`p-4 rounded-xl text-xl transition-all duration-300 flex items-center justify-center gap-2 mb-6 ${connectionStatus === 'Connected' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                'bg-blue-100 dark:bg-cyan-700/50 text-blue-700 dark:text-cyan-300'
                }`}>
                <svg className={`w-8 h-8 ${connectionStatus === 'Connected' ? 'text-green-500' : 'text-blue-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {connectionStatus === 'Connected' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                {connectionStatus}
              </div>

              <button
                onClick={() => {
                  handleConnect();
                  setShowConnectModal(false);
                }}
                className={`w-full py-4 px-8 text-xl rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${device
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                  }`}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {device ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  )}
                </svg>
                {device ? 'Disconnect' : 'Connect to PUMO'}
              </button>

              <div className="mt-6 text-sm text-blue-500 dark:text-cyan-400 text-center">
                {!device && (
                  <p className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Make sure your ESP32 is powered on and in range
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Grid Modal */}
        {showGridModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#fdfdf7] dark:bg-slate-800/90 rounded-3xl shadow-xl p-8 max-w-6xl w-full mx-4 animate-fade-in border-4 border-blue-200/50 dark:border-cyan-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl text-blue-500 dark:text-cyan-400 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  แผนที่การเดิน
                </h2>
                <button
                  onClick={() => setShowGridModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-8">
                {/* Grid Section */}
                <div className="flex-1">
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 36 }).map((_, index) => {
                      const x = index % 6;
                      const y = Math.floor(index / 6);
                      const isCurrentPosition = x === position.x && y === position.y;
                      
                      return (
                        <div
                          key={index}
                          className={`aspect-square border-2 rounded-lg flex items-center justify-center text-2xl font-bold
                            ${isCurrentPosition 
                              ? 'bg-blue-500/20 dark:bg-blue-500/20 border-blue-600' 
                              : 'bg-white/80 dark:bg-slate-800/80 border-blue-200 dark:border-cyan-700/50'
                            }`}
                        >
                          {isCurrentPosition ? (
                            <div className={`transform transition-transform duration-300 ${
                              direction === 0 ? 'rotate-0' : 
                              direction === 1 ? 'rotate-90' : 
                              direction === 2 ? 'rotate-180' : 
                              'rotate-270'
                            }`}>
                              <img 
                                src="/images/pumo-logo.png" 
                                alt="PUMO" 
                                className="w-8 h-8 object-contain"
                              />
                            </div>
                          ) : ''}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>ตำแหน่งปัจจุบัน: ({position.x + 1}, {6 - position.y})</p>
                    <p>ทิศทาง: {
                      direction === 0 ? 'ขึ้น' :
                      direction === 1 ? 'ขวา' :
                      direction === 2 ? 'ลง' :
                      'ซ้าย'
                    }</p>
                  </div>
                </div>

                {/* Command History Section */}
                <div className="w-80 bg-blue-50/50 dark:bg-cyan-700/30 rounded-2xl p-6">
                  <h2 className="text-xl text-blue-500 dark:text-cyan-400 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ประวัติคำสั่ง
                  </h2>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {commandHistory.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">ยังไม่มีประวัติคำสั่ง</p>
                    ) : (
                      commandHistory.map((item, index) => (
                        <div key={index} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl">
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp}</div>
                          <div className="text-sm font-medium text-blue-600 dark:text-cyan-400 break-all">{item.commands}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
