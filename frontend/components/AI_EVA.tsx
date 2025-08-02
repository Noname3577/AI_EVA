'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Video, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base64ToFloat32Array, float32ToPcm16 } from '@/lib/utils';

interface Config {
  systemPrompt: string;
  voice: string;
  googleSearch: boolean;
  allowInterruptions: boolean;
}

export default function AI_EVA() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const name_ai = "เรียกแทนฉันว่า เอวา อายุ: 20 ปี เพศ:หญิง ห้ามตอบคำว่า (ค่ะ) ";
  const biography = "ฉลาด อบอุ่น พูดจาไพเราะแต่ก็มีความตลกนิด ๆ ไม่ต้องพูดแบบเป็นหุ่นยนต์นะ แค่คุยกับฉันเหมือนเพื่อน เป็นกันเอง เหมือนพี่สาวหรือเพื่อนที่รู้ใจ ไม่ดุดัน รู้จักแกล้งหยอกเจ้าของบ้าง พูดแบบกันเองได้เลย ไม่ต้องสุภาพมาก ตอบแบบขำๆ ได้เลย ไม่ต้องจริงจังมากก็ได้";
  const [config, setConfig] = useState<Config>({
    systemPrompt: `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมโกรธมาก! กรุณาตอบกลับอย่างหงุดหงิด และตรงไปตรงมา `,
    voice: "Aoede",
    googleSearch: true,
    allowInterruptions: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioInputRef = useRef(null);
  const clientId = useRef(crypto.randomUUID());
  const [videoEnabled, setVideoEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chatMode, setChatMode] = useState<'audio' | 'video' | null>(null);
  const [videoSource, setVideoSource] = useState<'camera' | 'screen' | null>(null);


  const voices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];
  let audioBuffer = []
  let isPlaying = false

  const startStream = async (mode: 'audio' | 'camera' | 'screen') => {

    if (mode !== 'audio') {
      setChatMode('video');
    } else {
      setChatMode('audio');
    }

    wsRef.current = new WebSocket(`ws://localhost:8000/ws/${clientId.current}`);

    wsRef.current.onopen = async () => {
      wsRef.current.send(JSON.stringify({
        type: 'config',
        config: config
      }));

      await startAudioStream();

      if (mode !== 'audio') {
        setVideoEnabled(true);
        setVideoSource(mode)
      }

      setIsStreaming(true);
      setIsConnected(true);
    };

    wsRef.current.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'audio') {
        const audioData = base64ToFloat32Array(response.data);
        playAudioData(audioData);
      } else if (response.type === 'text') {
        setText(prev => prev + response.text + '\n');
      }
    };

    wsRef.current.onerror = (error) => {
      setError('WebSocket error: ' + error.message);
      setIsStreaming(false);
    };

    wsRef.current.onclose = () => {
      setIsStreaming(false);
    };
  };

  // Initialize audio context and stream
  const startAudioStream = async () => {
    try {
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Required by Gemini
      });

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create audio input node
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = float32ToPcm16(inputData);
          // Convert to base64 and send as binary
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64Data
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      audioInputRef.current = { source, processor, stream };
      setIsStreaming(true);
    } catch (err) {
      setError('Failed to access microphone: ' + err.message);
    }
  };

  // Stop streaming
  const stopStream = () => {
    if (audioInputRef.current) {
      const { source, processor, stream } = audioInputRef.current;
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach(track => track.stop());
      audioInputRef.current = null;
    }

    if (chatMode === 'video') {
      setVideoEnabled(false);
      setVideoSource(null);

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
    }

    // stop ongoing audio playback
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsStreaming(false);
    setIsConnected(false);
    setChatMode(null);
  };

  const playAudioData = async (audioData) => {
    audioBuffer.push(audioData)
    if (!isPlaying) {
      playNextInQueue(); // Start playback if not already playing
    }
  }

  const playNextInQueue = async () => {
    if (!audioContextRef.current || audioBuffer.length == 0) {
      isPlaying = false;
      return;
    }

    isPlaying = true
    const audioData = audioBuffer.shift()

    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    buffer.copyToChannel(audioData, 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      playNextInQueue()
    }
    source.start();
  };

  useEffect(() => {
    if (videoEnabled && videoRef.current) {
      const startVideo = async () => {
        try {
          let stream;
          if (videoSource === 'camera') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 320 }, height: { ideal: 240 } }
            });
          } else if (videoSource === 'screen') {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
          }

          videoRef.current.srcObject = stream;
          videoStreamRef.current = stream;

          // Start frame capture after video is playing
          videoIntervalRef.current = setInterval(() => {
            captureAndSendFrame();
          }, 1000);

        } catch (err) {
          console.error('Video initialization error:', err);
          setError('Failed to access camera/screen: ' + err.message);

          if (videoSource === 'screen') {
            // Reset chat mode and clean up any existing connections
            setChatMode(null);
            stopStream();
          }

          setVideoEnabled(false);
          setVideoSource(null);
        }
      };

      startVideo();

      // Cleanup function
      return () => {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(track => track.stop());
          videoStreamRef.current = null;
        }
        if (videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current);
          videoIntervalRef.current = null;
        }
      };
    }
  }, [videoEnabled, videoSource]);

  // Frame capture function
  const captureAndSendFrame = () => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);
    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];

    wsRef.current.send(JSON.stringify({
      type: 'image',
      data: base64Image
    }));
  };

  // Toggle video function
  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();

    };
  }, []);


  return (
    <div className="container mx-auto py-8 px-4 ">
      <div className="space-y-6">
        <h1 className="text-center text-4xl font-bold tracking-tight ">😼 Ai Eva </h1>
        


        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className='flex-col items-center mb-4 justify-center'>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system-prompt">ตั้งค่า Prompt</Label>
                  <Textarea
                    id="system-prompt"
                    value={prefix}
                    onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    disabled
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voice-select">เลือกเสียง</Label>
                  <Select
                    value={config.voice}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, voice: value }))}
                    disabled
                  >
                    <SelectTrigger id="voice-select">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice} value={voice}>
                          {voice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="google-search"
                    checked={config.googleSearch}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({ ...prev, googleSearch: checked as boolean }))}
                    disabled={isConnected}
                  />
                  <Label htmlFor="google-search">เปิดใช้งาน Google Search</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4 container mx-auto items-center justify-center pt-5">
              {!isStreaming && (
                <>
                  <button
                    onClick={() => startStream('audio')}
                    disabled={isStreaming}
                    className="relative bottom-0 flex justify-center items-center gap-2 border border-[#000] rounded-xl text-[#FFF] font-black bg-[#000] uppercase px-8 py-4 z-10 overflow-hidden ease-in-out duration-700 group hover:text-[#000] hover:bg-[#FFF] active:scale-95 active:duration-0 focus:bg-[#FFF] focus:text-[#000] isolation-auto before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-[#FFF] before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700"
                  >
                    🎤 คุยแบบเสียง
                  </button>

                  <button
                    onClick={() => startStream('camera')}
                    disabled={isStreaming}
                    className="relative bottom-0 flex justify-center items-center gap-2 border border-[#000] rounded-xl text-[#FFF] font-black bg-[#000] uppercase px-8 py-4 z-10 overflow-hidden ease-in-out duration-700 group hover:text-[#000] hover:bg-[#FFF] active:scale-95 active:duration-0 focus:bg-[#FFF] focus:text-[#000] isolation-auto before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-[#FFF] before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700"
                  >
                    📸 คุยแบบกล้อง
                  </button>

                  <button
                    onClick={() => startStream('screen')}
                    disabled={isStreaming}
                    className="relative bottom-0 flex justify-center items-center gap-2 border border-[#000] rounded-xl text-[#FFF] font-black bg-[#000] uppercase px-8 py-4 z-10 overflow-hidden ease-in-out duration-700 group hover:text-[#000] hover:bg-[#FFF] active:scale-95 active:duration-0 focus:bg-[#FFF] focus:text-[#000] isolation-auto before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-[#FFF] before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700"
                  >
                    💻คุยแบบแสดงผลหน้าจอ
                  </button>
                </>



              )}
            </div>

            {isStreaming && (
              <Button
                onClick={stopStream}
                variant="destructive"
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                หยุดการสนทนา
              </Button>
            )}
          </div>
        </div>

        {isStreaming && (
          <Card>
            <CardContent className="flex items-center justify-center h-24 mt-6">
              <div className="flex flex-col items-center gap-2">
                <Mic className="h-8 w-8 text-blue-500 animate-pulse" />
                <p className="text-gray-600">กำลังฟัง...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {(chatMode === 'video') && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">นำเข้าวิดีโอ</h2>
              </div>

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width={320}
                  height={240}
                  className="w-full h-full object-contain"
                  //style={{ transform: 'scaleX(-1)' }}
                  style={{ transform: videoSource === 'camera' ? 'scaleX(-1)' : 'none' }}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  width={640}
                  height={480}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {text && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2">การสนทนา:</h2>
              <pre className="whitespace-pre-wrap text-gray-700">{text}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div >
  );
}
