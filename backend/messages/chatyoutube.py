import pytchat

video_id = "nS8id3NCQtU"

def start_chat():
    chat = pytchat.create(video_id=video_id)
    try:
        while chat.is_alive():
            for c in chat.get().sync_items():
                yield c.message  
    except KeyboardInterrupt:
        print("🛑 หยุดดึงแชทแล้ว")
