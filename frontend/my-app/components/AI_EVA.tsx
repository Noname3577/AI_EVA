"use client"

import { useState, useRef, useEffect } from "react"
import {
  Mic,
  StopCircle,
  Settings,
  History,
  Download,
  Moon,
  Sun,
  Copy,
  Trash2,
  Save,
  Zap,
  Heart,
  MessageSquare,
  Camera,
  Monitor,
  Headphones,
  ChevronDown,
  ChevronUp,
  Activity,
  Plus,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { base64ToFloat32Array, float32ToPcm16 } from "@/lib/utils"

interface Config {
  systemPrompt: string
  voice: string
  googleSearch: boolean
  allowInterruptions: boolean
}

interface ChatMessage {
  id: string
  type: "user" | "ai" | "system"
  content: string
  timestamp: Date
}

interface SavedConfig {
  id: string
  name: string
  config: Config
  timestamp: Date
}

interface ActivityStatus {
  id: string
  name: string
  emoji: string
  prompts: string[]
  color: string
}

export default function AI_EVA() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [text, setText] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [config, setConfig] = useState<Config>({
    systemPrompt:
      "เรียกแทนฉันว่า เอวา อายุ: 20 ปี เพศ:หญิง ห้ามตอบคำว่า (ค่ะ) ฉลาด อบอุ่น พูดจาไพเราะแต่ก็มีความตลกนิด ๆ ไม่ต้องพูดแบบเป็นหุ่นยนต์นะ แค่คุยกับฉันเหมือนเพื่อน เป็นกันเอง เหมือนพี่สาวหรือเพื่อนที่รู้ใจ ไม่ดุดัน รู้จักแกล้งหยอกเจ้าของบ้าง พูดแบบกันเองได้เลย ไม่ต้องสุภาพมาก ตอบแบบขำๆ ได้เลย ไม่ต้องจริงจังมากก็ได้",
    voice: "Aoede",
    googleSearch: true,
    allowInterruptions: false,
  })
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; type: "info" | "success" | "error" }>
  >([])
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showActivityManager, setShowActivityManager] = useState(false)

  // Activity Status
  const [currentActivity, setCurrentActivity] = useState<ActivityStatus | null>(null)
  const [activityStatuses, setActivityStatuses] = useState<ActivityStatus[]>([
    {
      id: "gaming",
      name: "เล่นเกม",
      emoji: "🎮",
      prompts: [
        "กำลังเล่นเกมอยู่ มาคุยกันหน่อยสิ",
        "เล่นเกมเหนื่อยแล้ว พักสักหน่อย",
        "เกมนี้ยากจัง ช่วยให้กำลังใจหน่อย",
        "ชนะแล้ว! มาเฉลิมฉลองกัน",
      ],
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "reading",
      name: "อ่านหนังสือ",
      emoji: "📚",
      prompts: [
        "กำลังอ่านหนังสืออยู่ เงียบๆ นะ",
        "หนังสือเล่มนี้น่าสนใจมาก",
        "อ่านหนังสือจนตาเมื่อย พักสายตาหน่อย",
        "จบบทแล้ว มาคุยกันสักหน่อย",
      ],
      color: "from-green-500 to-teal-500",
    },
    {
      id: "working",
      name: "ทำงาน",
      emoji: "💼",
      prompts: [
        "กำลังทำงานอยู่ อย่ารบกวนนะ",
        "งานเยอะมาก ช่วยให้กำลังใจหน่อย",
        "ทำงานเสร็จแล้ว พักผ่อนกัน",
        "งานนี้ยากจัง ขอคำแนะนำหน่อย",
      ],
      color: "from-blue-500 to-indigo-500",
    },
    {
      id: "studying",
      name: "เรียนหนังสือ",
      emoji: "📖",
      prompts: ["กำลังเรียนอยู่ ต้องตั้งใจ", "เรียนจนปวดหัว พักสมองหน่อย", "ข้อสอบยากมาก ช่วยอธิบายหน่อย", "เรียนจบแล้ว รู้สึกดีมาก"],
      color: "from-orange-500 to-red-500",
    },
    {
      id: "relaxing",
      name: "พักผ่อน",
      emoji: "😌",
      prompts: ["กำลังพักผ่อนอยู่ สบายมาก", "วันนี้เหนื่อยมาก อยากพักผ่อน", "นอนฟังเพลงอยู่ สบายใจ", "พักผ่อนเสร็จแล้ว กลับมาทำงานต่อ"],
      color: "from-cyan-500 to-blue-500",
    },
    {
      id: "eating",
      name: "กินข้าว",
      emoji: "🍽️",
      prompts: ["กำลังกินข้าวอยู่ อร่อยมาก", "หิวข้าวแล้ว ไปหาอะไรกิน", "กินเสร็จแล้ว อิ่มมาก", "วันนี้กินอะไรดีนะ"],
      color: "from-yellow-500 to-orange-500",
    },
    {
      id: "exercising",
      name: "ออกกำลังกาย",
      emoji: "🏃‍♂️",
      prompts: ["กำลังออกกำลังกายอยู่ เหนื่อยมาก", "วิ่งเสร็จแล้ว เหนื่อยแต่สดชื่น", "ยืดเส้นยืดสายกัน ผ่อนคลาย", "ออกกำลังกายทุกวัน สุขภาพดี"],
      color: "from-red-500 to-pink-500",
    },
    {
      id: "idle",
      name: "อยู่เฉยๆ",
      emoji: "😐",
      prompts: ["อยู่เฉยๆ ไม่รู้จะทำอะไร", "เบื่อมาก หาอะไรทำหน่อย", "นั่งเฉยๆ คิดเรื่องต่างๆ", "ว่างมาก มาคุยกันเถอะ"],
      color: "from-gray-500 to-gray-600",
    },
    {
      id: "silent",
      name: "เงียบ",
      emoji: "🤫",
      prompts: ["เงียบ...", "ไม่อยากพูดอะไร", "อยู่คนเดียว เงียบๆ", "ช่วงนี้อยากเงียบหน่อย"],
      color: "from-slate-500 to-gray-500",
    },
  ])

  // Custom activity states
  const [newActivityName, setNewActivityName] = useState("")
  const [newActivityEmoji, setNewActivityEmoji] = useState("")
  const [newActivityPrompts, setNewActivityPrompts] = useState([""])
  const [editingActivity, setEditingActivity] = useState<ActivityStatus | null>(null)

  const wsRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioInputRef = useRef(null)
  const clientId = useRef(crypto.randomUUID())
  const [videoEnabled, setVideoEnabled] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [chatMode, setChatMode] = useState<"audio" | "video" | null>(null)
  const [videoSource, setVideoSource] = useState<"camera" | "screen" | null>(null)
  const [textInput, setTextInput] = useState("")
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  // YouTube Chat states
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [isYoutubeChatActive, setIsYoutubeChatActive] = useState(false)
  const [youtubeChatMessages, setYoutubeChatMessages] = useState([])
  const [chatStats, setChatStats] = useState({ totalMessages: 0, uniqueUsers: new Set() })

  const voices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"]
  const audioBuffer = []
  let isPlaying = false

  // Quick preset prompts
  const presetPrompts = [
    {
      name: "🤗 เป็นมิตร",
      prompt: "เรียกแทนฉันว่า เอวา พูดจาเป็นมิตร อบอุ่น ใส่ใจ เหมือนเพื่อนสนิท",
      color: "from-green-400 to-blue-500",
    },
    {
      name: "😄 ตลก",
      prompt: "เรียกแทนฉันว่า เอวา พูดจาตลก ขำขัน เฮฮา ชอบเล่าเรื่องขำๆ",
      color: "from-yellow-400 to-orange-500",
    },
    {
      name: "💼 จริงจัง",
      prompt: "เรียกแทนฉันว่า เอวา พูดจาจริงจัง เป็นทางการ มืออาชีพ ให้คำแนะนำที่ดี",
      color: "from-gray-400 to-gray-600",
    },
    {
      name: "😈 ซน",
      prompt: "เรียกแทนฉันว่า เอวา พูดจาซน ขี้เล่น แกล้ง ชอบหยอกล้อ",
      color: "from-purple-400 to-pink-500",
    },
    {
      name: "🧠 ฉลาด",
      prompt: "เรียกแทนฉันว่า เอวา เป็นผู้เชี่ยวชาญ ให้ข้อมูลที่ถูกต้อง วิเคราะห์เชิงลึก",
      color: "from-blue-400 to-indigo-500",
    },
    {
      name: "💕 โรแมนติก",
      prompt: "เรียกแทนฉันว่า เอวา พูดจาหวาน โรแมนติก อ่อนโยน เหมือนคนรัก",
      color: "from-pink-400 to-red-500",
    },
  ]

  // Add notification function
  const addNotification = (message: string, type: "info" | "success" | "error" = "info") => {
    const id = crypto.randomUUID()
    setNotifications((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 5000)
  }

  // Activity management functions
  const selectActivity = (activity: ActivityStatus) => {
    setCurrentActivity(activity)
    addNotification(`เลือกสถานะ: ${activity.emoji} ${activity.name}`, "success")
  }

  const addCustomActivity = () => {
    if (!newActivityName.trim() || !newActivityEmoji.trim() || newActivityPrompts.every((p) => !p.trim())) {
      addNotification("กรุณากรอกข้อมูลให้ครบถ้วน", "error")
      return
    }

    const newActivity: ActivityStatus = {
      id: crypto.randomUUID(),
      name: newActivityName.trim(),
      emoji: newActivityEmoji.trim(),
      prompts: newActivityPrompts.filter((p) => p.trim()),
      color: "from-indigo-500 to-purple-500",
    }

    setActivityStatuses((prev) => [...prev, newActivity])
    setNewActivityName("")
    setNewActivityEmoji("")
    setNewActivityPrompts([""])
    addNotification(`เพิ่มกิจกรรม "${newActivity.name}" เรียบร้อย`, "success")

    // Save to localStorage
    const updatedActivities = [...activityStatuses, newActivity]
    localStorage.setItem("eva-activity-statuses", JSON.stringify(updatedActivities))
  }

  const deleteActivity = (activityId: string) => {
    if (confirm("ต้องการลบกิจกรรมนี้หรือไม่?")) {
      setActivityStatuses((prev) => prev.filter((a) => a.id !== activityId))
      if (currentActivity?.id === activityId) {
        setCurrentActivity(null)
      }
      addNotification("ลบกิจกรรมเรียบร้อย", "success")

      // Save to localStorage
      const updatedActivities = activityStatuses.filter((a) => a.id !== activityId)
      localStorage.setItem("eva-activity-statuses", JSON.stringify(updatedActivities))
    }
  }

  const addPromptToActivity = (activityId: string, prompt: string) => {
    if (!prompt.trim()) return

    setActivityStatuses((prev) =>
      prev.map((activity) =>
        activity.id === activityId ? { ...activity, prompts: [...activity.prompts, prompt.trim()] } : activity,
      ),
    )
    addNotification("เพิ่มข้อความเรียบร้อย", "success")
  }

  // Save config function
  const saveConfig = () => {
    const name = prompt("ชื่อการตั้งค่า:")
    if (name) {
      const newConfig: SavedConfig = {
        id: crypto.randomUUID(),
        name,
        config: { ...config },
        timestamp: new Date(),
      }
      setSavedConfigs((prev) => [...prev, newConfig])
      localStorage.setItem("eva-saved-configs", JSON.stringify([...savedConfigs, newConfig]))
      addNotification(`บันทึกการตั้งค่า "${name}" เรียบร้อย`, "success")
    }
  }

  // Load config function
  const loadConfig = (savedConfig: SavedConfig) => {
    setConfig(savedConfig.config)
    addNotification(`โหลดการตั้งค่า "${savedConfig.name}" เรียบร้อย`, "success")
  }

  // Export chat history
  const exportChatHistory = () => {
    const dataStr = JSON.stringify(chatHistory, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `eva-chat-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    addNotification("ส่งออกประวัติการสนทนาเรียบร้อย", "success")
  }

  // Clear chat history
  const clearChatHistory = () => {
    if (confirm("ต้องการลบประวัติการสนทนาทั้งหมดหรือไม่?")) {
      setChatHistory([])
      setText("")
      addNotification("ลบประวัติการสนทนาเรียบร้อย", "success")
    }
  }

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addNotification("คัดลอกข้อความเรียบร้อย", "success")
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  // Apply preset prompt
  const applyPreset = (preset: any) => {
    setConfig((prev) => ({ ...prev, systemPrompt: preset.prompt }))
    addNotification(`ใช้เทมเพลต "${preset.name}" เรียบร้อย`, "success")
    setShowPresets(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault()
            saveConfig()
            break
          case "e":
            e.preventDefault()
            exportChatHistory()
            break
          case "d":
            e.preventDefault()
            toggleDarkMode()
            break
          case "Enter":
            e.preventDefault()
            if (textInput.trim()) sendTextMessage()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [textInput])

  // Load saved configs and activities on mount
  useEffect(() => {
    const saved = localStorage.getItem("eva-saved-configs")
    if (saved) {
      setSavedConfigs(JSON.parse(saved))
    }

    const savedActivities = localStorage.getItem("eva-activity-statuses")
    if (savedActivities) {
      setActivityStatuses(JSON.parse(savedActivities))
    }
  }, [])

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^&\n?#]+)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const startStream = async (mode: "audio" | "camera" | "screen") => {
    setConnectionStatus("connecting")

    if (mode !== "audio") {
      setChatMode("video")
    } else {
      setChatMode("audio")
    }

    wsRef.current = new WebSocket(`ws://localhost:8000/ws/${clientId.current}`)

    wsRef.current.onopen = async () => {
      wsRef.current.send(
        JSON.stringify({
          type: "config",
          config: config,
        }),
      )

      await startAudioStream()

      if (mode !== "audio") {
        setVideoEnabled(true)
        setVideoSource(mode)
      }

      setIsStreaming(true)
      setIsConnected(true)
      setConnectionStatus("connected")
      addNotification("เชื่อมต่อสำเร็จ", "success")
    }

    wsRef.current.onmessage = async (event) => {
      const response = JSON.parse(event.data)

      if (response.type === "audio") {
        const audioData = base64ToFloat32Array(response.data)
        playAudioData(audioData)
      } else if (response.type === "text") {
        const newMessage: ChatMessage = {
          id: crypto.randomUUID(),
          type: "ai",
          content: response.text,
          timestamp: new Date(),
        }
        setChatHistory((prev) => [...prev, newMessage])
        setText((prev) => prev + response.text + "\n")
      } else if (response.type === "youtube_chat") {
        const chatMessage = response.data
        setYoutubeChatMessages((prev) => [...prev.slice(-19), chatMessage])

        setChatStats((prev) => {
          const newUniqueUsers = new Set(prev.uniqueUsers)
          newUniqueUsers.add(chatMessage.author)
          return {
            totalMessages: prev.totalMessages + 1,
            uniqueUsers: newUniqueUsers,
          }
        })
      } else if (response.type === "youtube_status") {
        if (response.data.success) {
          addNotification(response.data.message, "success")
        } else {
          setError(`YouTube Chat Error: ${response.data.error}`)
          addNotification(`YouTube Chat Error: ${response.data.error}`, "error")
        }
      }
    }

    wsRef.current.onerror = (error) => {
      setError("WebSocket error: " + error.message)
      setIsStreaming(false)
      setConnectionStatus("disconnected")
      addNotification("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error")
    }

    wsRef.current.onclose = () => {
      setIsStreaming(false)
      setIsYoutubeChatActive(false)
      setConnectionStatus("disconnected")
      addNotification("การเชื่อมต่อถูกตัด", "info")
    }
  }

  const startYoutubeChat = () => {
    if (!youtubeUrl.trim() || !wsRef.current) return

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      setError("Invalid YouTube URL")
      addNotification("URL YouTube ไม่ถูกต้อง", "error")
      return
    }

    wsRef.current.send(
      JSON.stringify({
        type: "youtube_start",
        video_id: videoId,
      }),
    )

    setIsYoutubeChatActive(true)
    setChatStats({ totalMessages: 0, uniqueUsers: new Set() })
    setError(null)
  }

  const stopYoutubeChat = () => {
    if (!wsRef.current) return

    wsRef.current.send(
      JSON.stringify({
        type: "youtube_stop",
      }),
    )

    setIsYoutubeChatActive(false)
    setYoutubeChatMessages([])
    setChatStats({ totalMessages: 0, uniqueUsers: new Set() })
  }

  const sendTextMessage = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && textInput.trim() !== "") {
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "user",
        content: textInput.trim(),
        timestamp: new Date(),
      }
      setChatHistory((prev) => [...prev, newMessage])

      wsRef.current.send(
        JSON.stringify({
          type: "text",
          data: textInput.trim(),
        }),
      )
      setTextInput("")
    }
  }

  const startIdleTimer = () => {
    clearIdleTimer()
    idleTimerRef.current = setTimeout(() => {
      sendIdlePrompt()
    }, 10000)
  }

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }

  const sendIdlePrompt = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Use current activity prompts or default
      let prompts = ["เงียบ..."]
      if (currentActivity && currentActivity.prompts.length > 0) {
        prompts = currentActivity.prompts
      }

      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]

      wsRef.current.send(
        JSON.stringify({
          type: "text",
          data: randomPrompt,
        }),
      )
    }
  }

  const startAudioStream = async () => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      })

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1)

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)
          const pcmData = float32ToPcm16(inputData)
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)))
          wsRef.current.send(
            JSON.stringify({
              type: "audio",
              data: base64Data,
            }),
          )
        }
      }

      source.connect(processor)
      processor.connect(audioContextRef.current.destination)
      audioInputRef.current = { source, processor, stream }
      setIsStreaming(true)
    } catch (err) {
      setError("Failed to access microphone: " + err.message)
      addNotification("ไม่สามารถเข้าถึงไมโครโฟนได้", "error")
    }
  }

  const stopStream = () => {
    if (audioInputRef.current) {
      const { source, processor, stream } = audioInputRef.current
      source.disconnect()
      processor.disconnect()
      stream.getTracks().forEach((track) => track.stop())
      audioInputRef.current = null
    }

    if (chatMode === "video") {
      setVideoEnabled(false)
      setVideoSource(null)

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop())
        videoStreamRef.current = null
      }
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current)
        videoIntervalRef.current = null
      }
    }

    if (isYoutubeChatActive) {
      stopYoutubeChat()
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsStreaming(false)
    setIsConnected(false)
    setChatMode(null)
    setConnectionStatus("disconnected")
  }

  const playAudioData = async (audioData) => {
    audioBuffer.push(audioData)
    if (!isPlaying) {
      playNextInQueue()
    }
  }

  const playNextInQueue = async () => {
    if (!audioContextRef.current || audioBuffer.length == 0) {
      isPlaying = false
      return
    }

    isPlaying = true
    const audioData = audioBuffer.shift()

    const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000)
    buffer.copyToChannel(audioData, 0)

    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.connect(audioContextRef.current.destination)

    source.onended = () => {
      playNextInQueue()
      startIdleTimer()
    }
    source.start()
  }

  useEffect(() => {
    if (videoEnabled && videoRef.current) {
      const startVideo = async () => {
        try {
          let stream
          if (videoSource === "camera") {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 320 }, height: { ideal: 240 } },
            })
          } else if (videoSource === "screen") {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
            })
          }

          videoRef.current.srcObject = stream
          videoStreamRef.current = stream

          videoIntervalRef.current = setInterval(() => {
            captureAndSendFrame()
          }, 1000)
        } catch (err) {
          console.error("Video initialization error:", err)
          setError("Failed to access camera/screen: " + err.message)
          addNotification("ไม่สามารถเข้าถึงกล้อง/หน้าจอได้", "error")

          if (videoSource === "screen") {
            setChatMode(null)
            stopStream()
          }

          setVideoEnabled(false)
          setVideoSource(null)
        }
      }

      startVideo()

      return () => {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach((track) => track.stop())
          videoStreamRef.current = null
        }
        if (videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current)
          videoIntervalRef.current = null
        }
      }
    }
  }, [videoEnabled, videoSource])

  const captureAndSendFrame = () => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) return

    const context = canvasRef.current.getContext("2d")
    if (!context) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight

    context.drawImage(videoRef.current, 0, 0)
    const base64Image = canvasRef.current.toDataURL("image/jpeg").split(",")[1]

    wsRef.current.send(
      JSON.stringify({
        type: "image",
        data: base64Image,
      }),
    )
  }

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [])

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${isDarkMode ? "dark bg-gray-900" : "bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50"}`}
    >
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg animate-in slide-in-from-right-5 ${
              notification.type === "success"
                ? "bg-green-500 text-white"
                : notification.type === "error"
                  ? "bg-red-500 text-white"
                  : "bg-blue-500 text-white"
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🤖 AI Eva
              </h1>
              <Badge variant={connectionStatus === "connected" ? "default" : "secondary"} className="animate-pulse">
                {connectionStatus === "connected"
                  ? "🟢 เชื่อมต่อแล้ว"
                  : connectionStatus === "connecting"
                    ? "🟡 กำลังเชื่อมต่อ"
                    : "🔴 ไม่ได้เชื่อมต่อ"}
              </Badge>
              {currentActivity && (
                <Badge variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                  {currentActivity.emoji} {currentActivity.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Activity Status Button */}
              <Dialog open={showActivityManager} onOpenChange={setShowActivityManager}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Activity className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>🎯 จัดการสถานะกิจกรรม</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Current Activity */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">สถานะปัจจุบัน:</h3>
                      {currentActivity ? (
                        <div className="flex items-center gap-2">
                          <Badge className={`bg-gradient-to-r ${currentActivity.color} text-white border-0`}>
                            {currentActivity.emoji} {currentActivity.name}
                          </Badge>
                          <Button onClick={() => setCurrentActivity(null)} variant="outline" size="sm">
                            ยกเลิก
                          </Button>
                        </div>
                      ) : (
                        <p className="text-gray-500">ไม่ได้เลือกสถานะ</p>
                      )}
                    </div>

                    {/* Activity Selection */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">เลือกสถานะ:</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {activityStatuses.map((activity) => (
                          <div key={activity.id} className="relative">
                            <Button
                              onClick={() => selectActivity(activity)}
                              variant="outline"
                              className={`w-full h-auto p-4 text-left justify-start bg-gradient-to-r ${activity.color} text-white border-0 hover:scale-105 transition-all duration-200 ${
                                currentActivity?.id === activity.id ? "ring-2 ring-yellow-400" : ""
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-sm">
                                  {activity.emoji} {activity.name}
                                </div>
                                <div className="text-xs opacity-90 mt-1">{activity.prompts.length} ข้อความ</div>
                              </div>
                            </Button>
                            {/* Delete button for custom activities */}
                            {![
                              "gaming",
                              "reading",
                              "working",
                              "studying",
                              "relaxing",
                              "eating",
                              "exercising",
                              "idle",
                              "silent",
                            ].includes(activity.id) && (
                              <Button
                                onClick={() => deleteActivity(activity.id)}
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Custom Activity */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-semibold">➕ เพิ่มกิจกรรมใหม่:</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ชื่อกิจกรรม</Label>
                          <input
                            type="text"
                            placeholder="เช่น ดูหนัง"
                            value={newActivityName}
                            onChange={(e) => setNewActivityName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Emoji</Label>
                          <input
                            type="text"
                            placeholder="🎬"
                            value={newActivityEmoji}
                            onChange={(e) => setNewActivityEmoji(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>ข้อความที่ AI จะพูด:</Label>
                        {newActivityPrompts.map((prompt, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="เช่น กำลังดูหนังอยู่ อย่ารบกวนนะ"
                              value={prompt}
                              onChange={(e) => {
                                const newPrompts = [...newActivityPrompts]
                                newPrompts[index] = e.target.value
                                setNewActivityPrompts(newPrompts)
                              }}
                              className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                            {index === newActivityPrompts.length - 1 && (
                              <Button
                                onClick={() => setNewActivityPrompts([...newActivityPrompts, ""])}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            {newActivityPrompts.length > 1 && (
                              <Button
                                onClick={() => {
                                  const newPrompts = newActivityPrompts.filter((_, i) => i !== index)
                                  setNewActivityPrompts(newPrompts)
                                }}
                                variant="destructive"
                                size="sm"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button onClick={addCustomActivity} className="w-full">
                        ➕ เพิ่มกิจกรรม
                      </Button>
                    </div>

                    {/* Activity Details */}
                    {currentActivity && (
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold">
                          📝 ข้อความของ {currentActivity.emoji} {currentActivity.name}:
                        </h3>
                        <div className="space-y-2">
                          {currentActivity.prompts.map((prompt, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                            >
                              <span className="text-sm">{prompt}</span>
                              <Button
                                onClick={() => copyToClipboard(prompt)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Dark Mode Toggle */}
              <Button variant="ghost" size="sm" onClick={toggleDarkMode}>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Settings Dialog */}
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>⚙️ การตั้งค่า</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="system-prompt">System Prompt</Label>
                      <Textarea
                        id="system-prompt"
                        value={config.systemPrompt}
                        onChange={(e) => setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                        disabled={isConnected}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="voice-select">เสียง</Label>
                        <Select
                          value={config.voice}
                          onValueChange={(value) => setConfig((prev) => ({ ...prev, voice: value }))}
                          disabled={isConnected}
                        >
                          <SelectTrigger>
                            <SelectValue />
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

                      <div className="space-y-2">
                        <Label>Google Search</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={config.googleSearch}
                            onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, googleSearch: checked }))}
                            disabled={isConnected}
                          />
                          <span className="text-sm">{config.googleSearch ? "เปิด" : "ปิด"}</span>
                        </div>
                      </div>
                    </div>

                    {/* YouTube Settings */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-semibold">📺 YouTube Live Chat</h3>
                      <div className="space-y-2">
                        <Label>YouTube URL</Label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            disabled={!isConnected}
                            className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                          />
                          <Button
                            onClick={isYoutubeChatActive ? stopYoutubeChat : startYoutubeChat}
                            disabled={!isConnected || !youtubeUrl.trim()}
                            variant={isYoutubeChatActive ? "destructive" : "default"}
                            size="sm"
                          >
                            {isYoutubeChatActive ? "หยุด" : "เริ่ม"}
                          </Button>
                        </div>
                      </div>

                      {isYoutubeChatActive && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span>ข้อความทั้งหมด:</span>
                            <span className="font-semibold">{chatStats.totalMessages}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ผู้ใช้ที่ไม่ซ้ำ:</span>
                            <span className="font-semibold">{chatStats.uniqueUsers.size}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Saved Configs */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-semibold">💾 การตั้งค่าที่บันทึกไว้</h3>
                      <div className="flex gap-2 mb-4">
                        <Button onClick={saveConfig} className="flex-1">
                          <Save className="h-4 w-4 mr-2" />
                          บันทึกการตั้งค่า
                        </Button>
                        <Button onClick={exportChatHistory} variant="outline" className="flex-1 bg-transparent">
                          <Download className="h-4 w-4 mr-2" />
                          ส่งออกประวัติ
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {savedConfigs.map((savedConfig) => (
                          <div key={savedConfig.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{savedConfig.name}</p>
                              <p className="text-xs text-gray-500">{savedConfig.timestamp.toLocaleDateString()}</p>
                            </div>
                            <Button onClick={() => loadConfig(savedConfig)} variant="outline" size="sm">
                              โหลด
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* History Dialog */}
              <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <History className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span>📝 ประวัติการสนทนา ({chatHistory.length} ข้อความ)</span>
                      <Button onClick={clearChatHistory} variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        ลบทั้งหมด
                      </Button>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {chatHistory.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">ยังไม่มีประวัติการสนทนา</p>
                    ) : (
                      chatHistory.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg ${
                            message.type === "user"
                              ? "bg-blue-100 dark:bg-blue-900 ml-8"
                              : "bg-gray-100 dark:bg-gray-700 mr-8"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {message.type === "user" ? "👤 คุณ" : "🤖 Eva"}
                              </span>
                              <span className="text-xs text-gray-500">{message.timestamp.toLocaleString()}</span>
                            </div>
                            <Button
                              onClick={() => copyToClipboard(message.content)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Activity Status Section */}
        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />🎯 สถานะกิจกรรม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {activityStatuses.slice(0, 10).map((activity) => (
                <Button
                  key={activity.id}
                  onClick={() => selectActivity(activity)}
                  variant="outline"
                  className={`h-auto p-3 text-center bg-gradient-to-r ${activity.color} text-white border-0 hover:scale-105 transition-all duration-200 ${
                    currentActivity?.id === activity.id ? "ring-2 ring-yellow-400 scale-105" : ""
                  }`}
                >
                  <div>
                    <div className="text-lg mb-1">{activity.emoji}</div>
                    <div className="text-xs font-medium">{activity.name}</div>
                  </div>
                </Button>
              ))}
            </div>
            {currentActivity && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <p className="text-sm">
                  <strong>สถานะปัจจุบัน:</strong> {currentActivity.emoji} {currentActivity.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  AI จะใช้ข้อความจาก {currentActivity.prompts.length} ตัวเลือกเมื่อเงียบ
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Presets Section */}
        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />⚡ เทมเพลตด่วน
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowPresets(!showPresets)}>
                {showPresets ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showPresets && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {presetPrompts.map((preset) => (
                  <Button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    variant="outline"
                    className={`h-auto p-4 text-left justify-start bg-gradient-to-r ${preset.color} text-white border-0 hover:scale-105 transition-all duration-200`}
                    disabled={isConnected}
                  >
                    <div>
                      <div className="font-semibold text-sm">{preset.name}</div>
                      <div className="text-xs opacity-90 mt-1 line-clamp-2">{preset.prompt.substring(0, 50)}...</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Control Panel */}
        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 justify-center">
              {!isStreaming ? (
                <>
                  <Button
                    onClick={() => startStream("audio")}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
                  >
                    <Headphones className="h-5 w-5 mr-2" />🎤 คุยแบบเสียง
                  </Button>

                  <Button
                    onClick={() => startStream("camera")}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
                  >
                    <Camera className="h-5 w-5 mr-2" />📸 คุยแบบกล้อง
                  </Button>

                  <Button
                    onClick={() => startStream("screen")}
                    className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-8 py-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
                  >
                    <Monitor className="h-5 w-5 mr-2" />💻 แสดงหน้าจอ
                  </Button>
                </>
              ) : (
                <Button
                  onClick={stopStream}
                  variant="destructive"
                  className="px-8 py-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  <StopCircle className="h-5 w-5 mr-2" />
                  ⏹️ หยุดการสนทนา
                </Button>
              )}
            </div>

            {/* Text Input */}
            {isStreaming && (
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="text"
                  placeholder="💬 พิมพ์ข้อความ... (Ctrl+Enter เพื่อส่ง)"
                  className="flex-1 px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      sendTextMessage()
                    }
                  }}
                />
                <Button
                  onClick={sendTextMessage}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  ส่ง
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {isStreaming && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-3">
                  <Mic className="h-8 w-8 text-green-500 animate-pulse" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-300">🎙️ กำลังฟัง</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {chatMode === "video" ? "📹 โหมดวิดีโอ" : "🎵 โหมดเสียง"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isYoutubeChatActive && (
            <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Heart className="h-8 w-8 text-red-500 mx-auto mb-2 animate-pulse" />
                  <p className="font-semibold text-red-700 dark:text-red-300">📺 YouTube Live</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{chatStats.totalMessages} ข้อความ</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="font-semibold text-blue-700 dark:text-blue-300">💬 ประวัติ</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{chatHistory.length} ข้อความ</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Video Display */}
        {chatMode === "video" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>📹 วิดีโอ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                  style={{ transform: videoSource === "camera" ? "scaleX(-1)" : "none" }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Display */}
        {text && (
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>💬 การสนทนา</span>
                <Button onClick={() => copyToClipboard(text)} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  คัดลอก
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">{text}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-2">
        <p>⌨️ Ctrl+S: บันทึก | Ctrl+E: ส่งออก | Ctrl+D: โหมดมืด</p>
      </div>
    </div>
  )
}
