'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface HardwareData {
    capacity: string;
    generation: string;
    brand: string;
    speed: string;
    timestamp?: string;
}

interface ScannedItem extends HardwareData {
    id: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function HardwareScanner() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [currentResult, setCurrentResult] = useState<HardwareData | null>(null);
    const [error, setError] = useState<string>('');
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Start camera stream
    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 1280, height: 720 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }

            setStream(mediaStream);
            setIsCameraReady(true);
            setError('');
        } catch (err) {
            setError('Failed to access camera. Please ensure camera permissions are granted.');
            console.error('Camera error:', err);
        }
    }, []);

    // Stop camera stream
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraReady(false);
    }, [stream]);

    // Start scanning session
    const startSession = useCallback(async () => {
        const newSessionId = `session_${Date.now()}`;
        setSessionId(newSessionId);
        setScannedItems([]);
        setIsSessionActive(true);
        setShowResult(false);
        setCurrentResult(null);
        await startCamera();
    }, [startCamera]);

    // End scanning session
    const endSession = useCallback(() => {
        stopCamera();
        setIsSessionActive(false);
        setShowResult(false);
    }, [stopCamera]);

    // Capture and process image
    const captureImage = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || isProcessing) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0);

        // Get base64 image (remove data:image/jpeg;base64, prefix)
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        const base64Image = imageData.split(',')[1];

        setIsProcessing(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/process-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    image_base64: base64Image
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                const newItem: ScannedItem = {
                    ...result.data,
                    id: scannedItems.length + 1
                };
                setScannedItems(prev => [...prev, newItem]);
                setCurrentResult(result.data);
                setShowResult(true);
            } else {
                setError(result.error || 'Failed to process image');
            }
        } catch (err) {
            setError('Failed to connect to server. Please check if backend is running.');
            console.error('API error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, sessionId, scannedItems.length]);

    // Continue to next capture
    const continueCapture = useCallback(() => {
        setShowResult(false);
        setCurrentResult(null);
    }, []);

    // Export to Excel
    const exportToExcel = useCallback(async () => {
        if (!sessionId || scannedItems.length === 0) return;

        try {
            const response = await fetch(`${API_URL}/api/export/${sessionId}`);

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hardware_inventory_${sessionId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to export data');
            console.error('Export error:', err);
        }
    }, [sessionId, scannedItems.length]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🖥️</span>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Hardware Inventory Scanner</h1>
                                <p className="text-sm text-gray-400">AI-powered extraction for RAM, SSD & Storage</p>
                            </div>
                        </div>
                        {isSessionActive && (
                            <div className="flex items-center gap-4">
                                <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    Session Active
                                </div>
                                <div className="text-white font-semibold">
                                    {scannedItems.length} items scanned
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Controls */}
                {!isSessionActive ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10 text-center max-w-lg">
                            <div className="text-6xl mb-6">📷</div>
                            <h2 className="text-2xl font-bold text-white mb-4">Ready to Scan</h2>
                            <p className="text-gray-400 mb-8">
                                Start a scanning session to capture hardware labels. Click the capture button for each item.
                            </p>
                            <button
                                onClick={startSession}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
                            >
                                🚀 Start Scanning Session
                            </button>
                        </div>

                        {/* Previous Results */}
                        {scannedItems.length > 0 && (
                            <div className="mt-12 w-full">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-white">Last Session Results</h3>
                                    <button
                                        onClick={exportToExcel}
                                        className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        📥 Export to Excel
                                    </button>
                                </div>
                                <ResultsTable items={scannedItems} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Camera View */}
                        <div className="relative">
                            <div className="bg-black rounded-2xl overflow-hidden aspect-video relative shadow-2xl">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${showResult ? 'opacity-50' : ''}`}
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Processing Overlay */}
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-white text-lg font-semibold">Processing...</p>
                                        <p className="text-gray-400 text-sm">AI is analyzing the image</p>
                                    </div>
                                )}

                                {/* Result Overlay */}
                                {showResult && currentResult && !isProcessing && (
                                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6">
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm">
                                            <div className="text-center mb-4">
                                                <span className="text-4xl">✅</span>
                                                <h3 className="text-xl font-bold text-white mt-2">Item Scanned!</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <ResultItem label="Brand" value={currentResult.brand} />
                                                <ResultItem label="Capacity" value={currentResult.capacity} />
                                                <ResultItem label="Generation" value={currentResult.generation} />
                                                <ResultItem label="Speed" value={`${currentResult.speed} MHz`} />
                                            </div>
                                            <button
                                                onClick={continueCapture}
                                                className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                                            >
                                                📷 Capture Next Item
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Camera not ready */}
                                {!isCameraReady && !isProcessing && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                                            <p className="text-white">Initializing camera...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Capture Button */}
                            {!showResult && isCameraReady && !isProcessing && (
                                <button
                                    onClick={captureImage}
                                    className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-white rounded-full shadow-lg shadow-white/30 hover:scale-110 transition-transform flex items-center justify-center"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                                        <span className="text-2xl">📸</span>
                                    </div>
                                </button>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="mt-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Results Panel */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-white">Scanned Items ({scannedItems.length})</h3>
                                <div className="flex gap-3">
                                    {scannedItems.length > 0 && (
                                        <button
                                            onClick={exportToExcel}
                                            className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
                                        >
                                            📥 Export Excel
                                        </button>
                                    )}
                                    <button
                                        onClick={endSession}
                                        className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
                                    >
                                        ⏹️ End Session
                                    </button>
                                </div>
                            </div>

                            {scannedItems.length === 0 ? (
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
                                    <div className="text-4xl mb-4">📋</div>
                                    <p className="text-gray-400">No items scanned yet</p>
                                    <p className="text-gray-500 text-sm mt-2">Point camera at a hardware label and click capture</p>
                                </div>
                            ) : (
                                <ResultsTable items={scannedItems} />
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function ResultItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
            <span className="text-gray-400 text-sm">{label}</span>
            <span className="text-white font-semibold">{value}</span>
        </div>
    );
}

function ResultsTable({ items }: { items: ScannedItem[] }) {
    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Brand</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Capacity</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Gen</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Speed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {items.map((item, index) => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                                <td className="px-4 py-3 text-sm text-white font-medium">{item.brand}</td>
                                <td className="px-4 py-3 text-sm text-white">{item.capacity}</td>
                                <td className="px-4 py-3 text-sm text-white">{item.generation}</td>
                                <td className="px-4 py-3 text-sm text-white">{item.speed} MHz</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
