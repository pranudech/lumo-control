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
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const serviceUuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  const characteristicUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  const getCommandIcon = (command) => {
    if (!command) return null;
    
    const value = command.substring(1);
    const type = command[0];
    
    let icon;
    switch (type) {
      case 'F':
        icon = (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
        break;
      case 'R':
        icon = (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        );
        break;
      case 'L':
        icon = (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        );
        break;
      default:
        icon = null;
    }

    return (
      <div className="flex flex-col items-center">
        {icon}
        <span className="text-sm mt-1">{value}</span>
      </div>
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
    if (commands.length >= 12) {
      setStatus('Maximum 12 commands allowed');
      return;
    }
    const fullCommand = `${command}${value}`;
    setCommands([...commands, fullCommand]);
  };

  const removeCommand = (index) => {
    const newCommands = [...commands];
    newCommands.splice(index, 1);
    setCommands(newCommands);
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
    <div className="min-h-screen p-8 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-purple-900 dark:via-blue-900/20 dark:to-pink-900">
      <div className="max-w-6xl mx-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 animate-fade-in border-4 border-pink-200/50 dark:border-purple-700/50">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
              LUMO Control :)
            </h1>
          </div>
          <div className={`p-4 rounded-xl text-xl transition-all duration-300 flex items-center justify-center gap-2 ${status === 'Connected' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
              status.includes('failed') ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                'bg-pink-100 dark:bg-purple-700/50 text-pink-700 dark:text-purple-300'
            }`}>
            <svg className={`w-8 h-8 ${status === 'Connected' ? 'text-green-500' :
                status.includes('failed') ? 'text-red-500' : 'text-pink-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {status === 'Connected' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : status.includes('failed') ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            {status}
          </div>
        </div>

        <div className="bg-pink-50/50 dark:bg-purple-700/30 p-8 rounded-2xl mb-8 shadow-inner backdrop-blur-sm border-4 border-pink-200/50 dark:border-purple-700/50">
          <h2 className="text-3xl font-bold text-pink-500 dark:text-purple-400 mb-6 text-center flex items-center justify-center gap-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Command Preview
          </h2>

          <div className="flex flex-col items-center gap-6">
            <div className="w-full bg-white/80 dark:bg-slate-800/80 p-6 rounded-xl shadow-sm border-4 border-pink-200/50 dark:border-purple-700/50 min-h-[200px] flex items-center justify-center">
              <div className="grid grid-cols-6 gap-2 w-full">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div 
                    key={index}
                    className={`relative aspect-square rounded-lg border-2 ${commands[index]
                      ? 'bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 border-pink-300 dark:border-purple-500' 
                      : 'bg-white/50 dark:bg-slate-700/50 border-pink-200 dark:border-purple-700'
                    } flex items-center justify-center p-2`}
                  >
                    {commands[index] ? (
                      <>
                        <div className="text-pink-600 dark:text-purple-400">
                          {getCommandIcon(commands[index])}
                        </div>
                        <button
                          onClick={() => removeCommand(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span className="text-pink-400 dark:text-purple-500 text-sm">
                        ช่องที่ {index + 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              // onClick={() => {
                // console.log('sendAllCommands', commands);
                // sendAllCommands();
              // }}
              onClick={sendAllCommands}
              disabled={!device || commands.length === 0}
              className="w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex flex-col items-center justify-center gap-2 group animate-pulse"
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
              onClick={() => addCommand('FT', forwardValue)}
              disabled={!device}
              className="w-full h-48 bg-gradient-to-br from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center group"
            >
              <div className="transform group-hover:scale-110 transition-transform duration-300">
                <svg className="w-20 h-20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                F
              </div>
            </button>
          </div>
          
          <div className="flex flex-col items-center gap-4 group">
            <button
              onClick={() => addCommand('RR', rightValue)}
              disabled={!device}
              className="w-full h-48 bg-gradient-to-br from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center group"
            >
              <div className="transform group-hover:scale-110 transition-transform duration-300">
                <svg className="w-20 h-20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                R
              </div>
            </button>
          </div>
          
          <div className="flex flex-col items-center gap-4 group">
            <button
              onClick={() => addCommand('LR', leftValue)}
              disabled={!device}
              className="w-full h-48 bg-gradient-to-br from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-4xl font-bold rounded-xl shadow-lg hover:translate-y-[-5px] hover:shadow-xl transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center group"
            >
              <div className="transform group-hover:scale-110 transition-transform duration-300">
                <svg className="w-20 h-20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                L
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Connect Button */}
      <div className="fixed bottom-8 right-8 flex gap-4">
        <button
          onClick={() => setShowSettingsModal(true)}
          className="cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white p-4 rounded-full shadow-xl hover:translate-y-[-5px] hover:shadow-2xl transition-all duration-300 group"
        >
          <svg className="w-10 h-10 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button
          onClick={() => setShowConnectModal(true)}
          className="cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white p-4 rounded-full shadow-xl hover:translate-y-[-5px] hover:shadow-2xl transition-all duration-300 group"
        >
          <svg className="w-10 h-10 transform group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 backdrop-blur-sm border-4 border-pink-200/50 dark:border-purple-700/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-pink-500 dark:text-purple-400">Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-pink-400 hover:text-pink-600 dark:hover:text-purple-300 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-lg font-medium text-pink-600 dark:text-purple-400">Forward Value</label>
                <input
                  type="number"
                  value={forwardValue}
                  onChange={(e) => setForwardValue(e.target.value)}
                  className="w-full p-4 text-xl border-4 border-pink-200 dark:border-purple-600 rounded-xl focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                  step="0.1"
                  min="0"
                  max="10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-lg font-medium text-pink-600 dark:text-purple-400">Right Value</label>
                <input
                  type="number"
                  value={rightValue}
                  onChange={(e) => setRightValue(e.target.value)}
                  className="w-full p-4 text-xl border-4 border-pink-200 dark:border-purple-600 rounded-xl focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                  step="0.1"
                  min="0"
                  max="10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-lg font-medium text-pink-600 dark:text-purple-400">Left Value</label>
                <input
                  type="number"
                  value={leftValue}
                  onChange={(e) => setLeftValue(e.target.value)}
                  className="w-full p-4 text-xl border-4 border-pink-200 dark:border-purple-600 rounded-xl focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
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
          <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 backdrop-blur-sm border-4 border-pink-200/50 dark:border-purple-700/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-pink-500 dark:text-purple-400">Connection</h2>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-pink-400 hover:text-pink-600 dark:hover:text-purple-300 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={`p-4 rounded-xl text-xl transition-all duration-300 flex items-center justify-center gap-2 mb-6 ${connectionStatus === 'Connected' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                'bg-pink-100 dark:bg-purple-700/50 text-pink-700 dark:text-purple-300'
              }`}>
              <svg className={`w-8 h-8 ${connectionStatus === 'Connected' ? 'text-green-500' : 'text-pink-400'
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
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
                  : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white'
                }`}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {device ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                )}
              </svg>
              {device ? 'Disconnect' : 'Connect to LUMO'}
            </button>

            <div className="mt-6 text-sm text-pink-500 dark:text-purple-400 text-center">
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
    </div>
  );
}
