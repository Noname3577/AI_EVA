from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
from dotenv import load_dotenv
from websockets import connect
from typing import Dict
import pytchat
import threading
import queue
from datetime import datetime

load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class YouTubeChatMonitor:
    def __init__(self):
        self.chat = None
        self.is_running = False
        self.message_queue = queue.Queue()
        self.chat_thread = None
        self.websocket = None
        
    def set_websocket(self, websocket):
        """Set the WebSocket connection for sending messages"""
        self.websocket = websocket
        
    def start_monitoring(self, video_id):
        """เริ่มติดตาม YouTube Live Chat"""
        try:
            self.chat = pytchat.create(video_id=video_id)
            self.is_running = True
            
            # เริ่ม thread สำหรับติดตามแชท
            self.chat_thread = threading.Thread(target=self._monitor_chat)
            self.chat_thread.daemon = True
            self.chat_thread.start()
            
            return {"success": True, "message": "YouTube chat monitoring started"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _monitor_chat(self):
        """ติดตามแชทในแบบ background"""
        while self.is_running and self.chat.is_alive():
            try:
                for c in self.chat.get().sync_items():
                    if not self.is_running:
                        break
                        
                    message_data = {
                        "id": c.id,
                        "author": c.author.name,
                        "message": c.message,
                        "timestamp": c.datetime,
                        "author_channel_id": c.author.channelId,
                        "is_verified": getattr(c.author, 'isVerified', False),
                        "is_chat_owner": getattr(c.author, 'isChatOwner', False),
                        "is_chat_moderator": getattr(c.author, 'isChatModerator', False)
                    }
                    
                    # ใส่ข้อความลงใน queue
                    self.message_queue.put(message_data)
                    
                    # ส่งข้อความไปยัง WebSocket ถ้ามี
                    if self.websocket:
                        asyncio.create_task(self._send_to_websocket(message_data))
                    
            except Exception as e:
                print(f"YouTube chat error: {e}")
                asyncio.sleep(1)
    
    async def _send_to_websocket(self, message_data):
        """ส่งข้อความ YouTube chat ไปยัง WebSocket"""
        try:
            if self.websocket and self.websocket.client_state.value != 3:
                await self.websocket.send_json({
                    "type": "youtube_chat",
                    "data": message_data
                })
        except Exception as e:
            print(f"Error sending YouTube chat to WebSocket: {e}")
    
    def get_messages(self):
        """ดึงข้อความที่รอการประมวลผล"""
        messages = []
        while not self.message_queue.empty():
            try:
                messages.append(self.message_queue.get_nowait())
            except queue.Empty:
                break
        return messages
    
    def stop_monitoring(self):
        """หยุดการติดตาม"""
        self.is_running = False
        if self.chat:
            self.chat.terminate()
        return {"success": True, "message": "YouTube chat monitoring stopped"}

class GeminiConnection:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model = "gemini-2.0-flash-exp"
        self.uri = (
            "wss://generativelanguage.googleapis.com/ws/"
            "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={self.api_key}"
        )
        self.ws = None
        self.config = None

    async def connect(self):
        """Initialize connection to Gemini"""
        self.ws = await connect(self.uri, additional_headers={"Content-Type": "application/json"})
        
        if not self.config:
            raise ValueError("Configuration must be set before connecting")       

        # Send initial setup message with configuration
        setup_message = {
            "setup": {
                "model": f"models/{self.model}",
                "generation_config": {
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": self.config["voice"]
                            }
                        }
                    }
                },
                "system_instruction": {
                    "parts": [
                        {
                            "text": self.config["systemPrompt"]
                        }
                    ]
                }
            }
        }
        await self.ws.send(json.dumps(setup_message))
        
        # Wait for setup completion
        setup_response = await self.ws.recv()
        return setup_response

    def set_config(self, config):
        """Set configuration for the connection"""
        self.config = config

    async def send_audio(self, audio_data: str):
        """Send audio data to Gemini"""
        realtime_input_msg = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": audio_data,
                        "mime_type": "audio/pcm"
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(realtime_input_msg))

    async def receive(self):
        """Receive message from Gemini"""
        return await self.ws.recv()

    async def close(self):
        """Close the connection"""
        if self.ws:
            await self.ws.close()

    async def send_image(self, image_data: str):
        """Send image data to Gemini"""
        image_message = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": image_data,
                        "mime_type": "image/jpeg"
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(image_message))

    async def send_text(self, text: str):
        """Send text message to Gemini"""
        text_message = {
            "client_content": {
                "turns": [
                    {
                        "role": "user",
                        "parts": [{"text": text}]
                    }
                ],
                "turn_complete": True
            }
        }
        await self.ws.send(json.dumps(text_message))

# Store active connections and YouTube monitors
connections: Dict[str, GeminiConnection] = {}
youtube_monitors: Dict[str, YouTubeChatMonitor] = {}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    
    try:
        # Create new Gemini connection for this client
        gemini = GeminiConnection()
        connections[client_id] = gemini
        
        # Create YouTube chat monitor for this client
        youtube_monitor = YouTubeChatMonitor()
        youtube_monitor.set_websocket(websocket)
        youtube_monitors[client_id] = youtube_monitor
        
        # Wait for initial configuration
        config_data = await websocket.receive_json()
        if config_data.get("type") != "config":
            raise ValueError("First message must be configuration")
        
        # Set the configuration
        gemini.set_config(config_data.get("config", {}))
        
        # Initialize Gemini connection
        await gemini.connect()
        
        # Handle bidirectional communication
        async def receive_from_client():
            try:
                while True:
                    try:
                        # Check if connection is closed
                        if websocket.client_state.value == 3:  # WebSocket.CLOSED
                            print("WebSocket connection closed by client")
                            return
                            
                        message = await websocket.receive()
                        
                        # Check for close message
                        if message["type"] == "websocket.disconnect":
                            print("Received disconnect message")
                            return
                            
                        message_content = json.loads(message["text"])
                        msg_type = message_content["type"]
                        
                        if msg_type == "audio":
                            await gemini.send_audio(message_content["data"])    
                        elif msg_type == "image":
                            await gemini.send_image(message_content["data"])
                        elif msg_type == "text":
                            await gemini.send_text(message_content["data"])
                        elif msg_type == "youtube_start":
                            # เริ่มติดตาม YouTube Live Chat
                            video_id = message_content.get("video_id")
                            if video_id:
                                result = youtube_monitor.start_monitoring(video_id)
                                await websocket.send_json({
                                    "type": "youtube_status",
                                    "data": result
                                })
                        elif msg_type == "youtube_stop":
                            # หยุดติดตาม YouTube Live Chat
                            result = youtube_monitor.stop_monitoring()
                            await websocket.send_json({
                                "type": "youtube_status",
                                "data": result
                            })
                        else:
                            print(f"Unknown message type: {msg_type}")
                    except json.JSONDecodeError as e:
                        print(f"JSON decode error: {e}")
                        continue
                    except KeyError as e:
                        print(f"Key error in message: {e}")
                        continue
                    except Exception as e:
                        print(f"Error processing client message: {str(e)}")
                        if "disconnect message" in str(e):
                            return
                        continue
                            
            except Exception as e:
                print(f"Fatal error in receive_from_client: {str(e)}")
                return

        async def receive_from_gemini():
            try:
                while True:
                    if websocket.client_state.value == 3:  # WebSocket.CLOSED
                        print("WebSocket closed, stopping Gemini receiver")
                        return

                    msg = await gemini.receive()
                    response = json.loads(msg)
                    
                    # Forward audio data to client
                    try:
                        parts = response["serverContent"]["modelTurn"]["parts"]
                        for p in parts:
                            # Check connection state before each send
                            if websocket.client_state.value == 3:
                                return
                                
                            if "inlineData" in p:
                                audio_data = p["inlineData"]["data"]
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": audio_data
                                })
                            elif "text" in p:
                                print(f"Received text: {p['text']}")
                                await websocket.send_json({
                                    "type": "text",
                                    "text": p["text"]
                                })
                    except KeyError:
                        pass

                    # Handle turn completion
                    try:
                        if response["serverContent"]["turnComplete"]:
                            await websocket.send_json({
                                "type": "turn_complete",
                                "data": True
                            })
                    except KeyError:
                        pass
            except Exception as e:
                print(f"Error receiving from Gemini: {e}")

        async def process_youtube_messages():
            """ประมวลผลข้อความจาก YouTube Chat และส่งไปยัง Gemini"""
            try:
                while True:
                    if websocket.client_state.value == 3:
                        return
                    
                    # ตรวจสอบข้อความใหม่จาก YouTube Chat
                    messages = youtube_monitor.get_messages()
                    for msg in messages:
                        if websocket.client_state.value == 3:
                            return
                        
                        # ส่งข้อความไปยัง Gemini
                        youtube_text = f"{msg['message']}"
                        await gemini.send_text(youtube_text)
                    
                    await asyncio.sleep(1)  # ตรวจสอบทุก 1 วินาที
                    
            except Exception as e:
                print(f"Error processing YouTube messages: {e}")

        # Run all receiving tasks concurrently
        async with asyncio.TaskGroup() as tg:
            tg.create_task(receive_from_client())
            tg.create_task(receive_from_gemini())
            tg.create_task(process_youtube_messages())

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Cleanup
        if client_id in connections:
            await connections[client_id].close()
            del connections[client_id]
        
        if client_id in youtube_monitors:
            youtube_monitors[client_id].stop_monitoring()
            del youtube_monitors[client_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
