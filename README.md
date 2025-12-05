จากการวิเคราะห์โค้ดทั้งหมด ผมสามารถอธิบายหลักการทำงานของ **AI_EVA** ได้ดังนี้:

---

# 🤖 AI_EVA - หลักการทำงานทั้งหมด

## 📌 ภาพรวมโปรเจค

**AI_EVA** เป็น AI Assistant แบบ Real-time Voice/Video Chat ที่ใช้ **Google Gemini 2.0 Flash** เป็นหัวใจหลัก สามารถคุยโต้ตอบได้ทั้ง **เสียง**, **วิดีโอ (กล้อง/หน้าจอ)**, และ **ข้อความ** พร้อมรองรับการดึง **YouTube Live Chat** มาโต้ตอบด้วย

---

## 🏗️ โครงสร้างโปรเจค

```
AI_EVA/
├── backend/               # Python FastAPI Server
│   ├── main.py           # WebSocket API หลัก
│   ├── .env              # เก็บ GEMINI_API_KEY
│   └── messages/         # เก็บประวัติข้อความ
│
├── frontend/my-app/      # Next.js Web App
│   ├── components/
│   │   └── AI_EVA.tsx    # UI หลักทั้งหมด (~1,400 บรรทัด)
│   └── lib/utils.ts      # Audio conversion utilities
│
└── standalone/           # Desktop App (Python + Tkinter)
    ├── standalone.py     # Entry point
    ├── config_gui.py     # GUI settings
    ├── gemini_connection.py  # เชื่อมต่อ Gemini
    ├── voice_activity_detector.py  # VAD (ตรวจจับเสียงพูด)
    └── emotion/
        └── prompt_em.py  # Emotion-based prompts
```

---

## 🔄 หลักการทำงานหลัก (Data Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│  🎤 Microphone  │  📹 Camera/Screen  │  ⌨️ Text  │  📺 YouTube   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                           │
│  • จับเสียงจาก Mic (16kHz, PCM16)                                │
│  • จับภาพจาก Camera/Screen                                       │
│  • แปลงเป็น Base64                                              │
│  • ส่งผ่าน WebSocket                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                            │
│  • รับข้อมูลจาก Frontend                                         │
│  • จัดการ YouTube Live Chat (pytchat)                           │
│  • ส่งต่อไปยัง Gemini API                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE GEMINI 2.0 Flash (AI)                       │
│  • BidiGenerateContent API (Bidirectional Streaming)            │
│  • รับ Audio/Image/Text → ตอบกลับเป็น Audio                      │
│  • Real-time, Low-latency                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OUTPUT                                     │
│  🔊 Audio Response (24kHz) → เล่นผ่าน Speaker                    │
│  📝 Text Transcript → แสดงบนหน้าจอ                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 รายละเอียดแต่ละส่วน

### 1. **Backend (Python FastAPI)** - `main.py`

#### การเชื่อมต่อ Gemini
```python
# WebSocket URI ของ Gemini 2.0
uri = "wss://generativelanguage.googleapis.com/ws/"
      "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
      f"?key={api_key}"
```

#### ส่ง Configuration ไปยัง Gemini
```python
setup_message = {
    "setup": {
        "model": "models/gemini-2.0-flash-exp",
        "generation_config": {
            "response_modalities": ["AUDIO"],  # ตอบกลับเป็นเสียง
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": "Aoede"  # เสียงที่เลือก
                    }
                }
            }
        },
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        }
    }
}
```

#### รองรับ Input หลายประเภท
| Type | Format | Description |
|------|--------|-------------|
| `audio` | Base64 PCM | เสียงจากไมค์ |
| `image` | Base64 JPEG | ภาพจากกล้อง/หน้าจอ |
| `text` | String | ข้อความพิมพ์ |
| `youtube_start` | Video ID | เริ่มดึง YouTube Live Chat |

#### YouTube Live Chat Monitor
```python
class YouTubeChatMonitor:
    # ใช้ pytchat library
    # ดึงข้อความจาก YouTube Live แบบ Real-time
    # ส่งกลับไปยัง Frontend ผ่าน WebSocket
```

---

### 2. **Frontend (Next.js + TypeScript)** - `AI_EVA.tsx`

#### Audio Processing
```typescript
// จับเสียงจากไมค์
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

// สร้าง Audio Context (16kHz)
audioContext = new AudioContext({ sampleRate: 16000 })

// แปลง Float32 → PCM16 → Base64
const pcmData = float32ToPcm16(inputData)
const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)))

// ส่งไป Backend
ws.send(JSON.stringify({ type: "audio", data: base64Data }))
```

#### Video Capture
```typescript
// กล้อง
stream = await navigator.mediaDevices.getUserMedia({ video: {...} })

// แชร์หน้าจอ
stream = await navigator.mediaDevices.getDisplayMedia({ video: {...} })

// จับภาพทุก 1 วินาที → ส่งไป Backend
canvas.toDataURL("image/jpeg", 0.8)
```

#### Audio Playback
```typescript
// รับเสียงจาก Gemini (24kHz)
// แปลง Base64 → Float32Array → AudioBuffer
// เล่นผ่าน Web Audio API
```

#### ฟีเจอร์ UI
- 🎤 **โหมดเสียง** - คุยด้วยเสียงอย่างเดียว
- 📹 **โหมดกล้อง** - ส่งภาพจากกล้องไปด้วย
- 💻 **โหมดหน้าจอ** - แชร์หน้าจอให้ AI ดู
- ⚡ **เทมเพลตด่วน** - เปลี่ยนบุคลิก AI (เป็นมิตร, ตลก, จริงจัง, ฯลฯ)
- 🎯 **สถานะกิจกรรม** - บอก AI ว่ากำลังทำอะไร (เล่นเกม, ทำงาน, พักผ่อน)
- 📺 **YouTube Live** - ดึงแชทจาก YouTube Live มาให้ AI ตอบ

---

### 3. **Standalone Desktop App** - `standalone/`

#### Voice Activity Detection (VAD)
```python
# ใช้ Silero VAD (PyTorch)
class VoiceActivityDetector:
    def __init__(self):
        self.model, _ = torch.hub.load('snakers4/silero-vad', 'silero_vad')
    
    def is_speech(self, audio_data) -> bool:
        # ตรวจสอบว่ามีเสียงพูดหรือไม่
        # ถ้าไม่มี → ส่ง silence แทน (ประหยัด bandwidth)
        speech_prob = self.model(audio_tensor, 16000).item()
        return speech_prob > 0.5
```

#### Emotion-based Prompts
```python
# emotion/prompt_em.py
def create_prompt():
    emotion = get_main_emotion()  # โกรธ, รัก, สนุก
    
    if emotion == "โกรธ":
        return "ตอบด้วยอารมณ์หงุดหงิด..."
    elif emotion == "รัก":
        return "ตอบด้วยความอ่อนโยน..."
    elif emotion == "สนุก":
        return "ตอบด้วยความขี้เล่น..."
```

#### GUI (Tkinter)
```python
class ConfigGUI:
    # ตั้งค่า System Prompt
    # เลือกเสียง (Puck, Charon, Kore, Fenrir, Aoede)
    # เปิด/ปิด Google Search
    # เปิด/ปิด Allow Interruptions (ขัดจังหวะขณะ AI พูด)
    # Voice Equalizer แสดง Audio Level
```

---

## 🎛️ Configuration Options

| Setting | Description |
|---------|-------------|
| **System Prompt** | กำหนดบุคลิกและพฤติกรรมของ AI |
| **Voice** | เสียงของ AI (Puck, Charon, Kore, Fenrir, **Aoede**) |
| **Google Search** | ให้ AI ค้นหาข้อมูลจาก Google ได้ |
| **Allow Interruptions** | ให้ผู้ใช้ขัดจังหวะขณะ AI กำลังพูดได้ |

---

## 🚀 วิธีใช้งาน

### ผ่าน Web (Frontend + Backend)
```bash
# 1. ตั้งค่า API Key
# backend/.env
GEMINI_API_KEY=your_api_key

# 2. รัน Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 3. รัน Frontend
cd frontend/my-app
npm install
npm run dev

# 4. เปิด http://localhost:3000
```

### ผ่าน Desktop App (Standalone)
```bash
cd standalone
pip install -r requirements.txt
python standalone.py
```

### หรือใช้ `start_all.bat`
```batch
# รัน Backend + Frontend พร้อมกัน
start_all.bat
```

---

## 📊 สรุป Technology Stack

| Layer | Technology |
|-------|------------|
| **AI Model** | Google Gemini 2.0 Flash (Multimodal) |
| **Backend** | Python, FastAPI, WebSocket |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| **Desktop** | Python, Tkinter, PyAudio |
| **VAD** | Silero VAD (PyTorch) |
| **YouTube** | pytchat |
| **Audio** | Web Audio API, PyAudio |

---

## 💡 จุดเด่น

1. **Real-time Bidirectional** - คุยโต้ตอบแบบทันทีทันใด
2. **Multimodal** - รับทั้งเสียง, ภาพ, และข้อความ
3. **YouTube Integration** - ดึงแชทจาก Live Stream มาตอบ
4. **Customizable Personality** - เปลี่ยนบุคลิก AI ได้ตามต้องการ
5. **Activity-aware** - AI รู้ว่าผู้ใช้กำลังทำอะไร
6. **VAD** - ส่งเฉพาะเมื่อมีเสียงพูด (ประหยัด bandwidth)

นี่คือโปรเจค AI Assistant ที่ค่อนข้างสมบูรณ์สำหรับการคุยแบบ Real-time ครับ! 🎉
