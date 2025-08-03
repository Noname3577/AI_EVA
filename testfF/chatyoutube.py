import pytchat
from gtts import gTTS
import os
import uuid
from playsound import playsound

video_id = "nS8id3NCQtU"

def speak(text, lang="th"):
    # สร้างไฟล์เสียงแบบสุ่มชื่อกันชนกัน
    filename = f"temp_{uuid.uuid4().hex}.mp3"
    tts = gTTS(text=text, lang=lang)
    tts.save(filename)
    
    playsound(filename)
    os.remove(filename)

def main():
    chat = pytchat.create(video_id=video_id)
    try:
        while chat.is_alive():
            for c in chat.get().sync_items():
                print(f"{c.datetime} [{c.author.name}]- {c.message}")
                
                # พูดข้อความที่ได้รับ
                speak(c.message)
                
                if c.type == "superChat":
                    print("Thanks for the Super chat")
                    speak("ขอบคุณสำหรับซุปเปอร์แชทนะครับ")
    except KeyboardInterrupt:
        print("หยุดโปรแกรมแล้ว")

if __name__ == "__main__":
    main()
