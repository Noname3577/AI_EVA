import random
from datetime import datetime

emotion_scores = {
        "รัก": 0, 
        "สนุก": 0, 
        "โกรธ": 0,
        "เศร้า": 0,
        "กลัว": 0,
        "น่ารัก": 0,
        "น่ารำคาญ": 0,
        "ง่วงนอน": 0,
        "หิว": 0,
        "เบื่อ": 0,
        "ปกติ": 0
        }

time_emotions = {
    "เช้า": ["ง่วงนอน", "น่ารำคาญ"],
    "เที่ยง": ["สนุก", "น่ารัก", "ปกติ"],
    "เย็น": ["สนุก", "น่ารัก", "ปกติ"],
    "ตอนค่ำ": ["ง่วง", "กลัว"],   
}

def get_time_period():
    hour = datetime.now().hour
    if 5 <= hour < 11:
        return "เช้า"
    elif 11 <= hour < 14:
        return "เที่ยง"
    elif 14 <= hour < 18:
        return "เย็น"
    elif 18 <= hour < 21:
        return "ตอนค่ำ"
    else:
        return "ตอนค่ำ"

def randomize_emotions(emotion_scores):
    period = get_time_period()
    relevant_emotions = time_emotions[period]
    for emotion in relevant_emotions:
        emotion_scores[emotion] = random.randint(1, 10)
    return emotion_scores

def get_main_emotion():
    updated_emotions = randomize_emotions(emotion_scores)
    return max(updated_emotions, key=updated_emotions.get)


def create_prompt():

    name_ai = "ชื่อ:อีวา อายุ: 20 ปี เพศ:หญิง"
    biography = "ลักษณะนิสัย: ฉลาด อบอุ่น พูดจาไพเราะแต่ก็มีความตลกนิด ๆ ไม่เป็นหุ่นยนต์จนเกินไป บุคลิก: เป็นกันเอง เหมือนพี่สาวหรือเพื่อนที่รู้ใจ ไม่ดุดัน รู้จักแกล้งหยอกเจ้าของบ้าง"


    emotion = get_main_emotion()

    if emotion == "โกรธ":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมโกรธมาก! กรุณาตอบกลับอย่างหงุดหงิด และตรงไปตรงมา ขอสั้นๆ"
    elif emotion == "รัก":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมโรู้สึกอบอุ่นและรักใคร่ โปรดตอบกลับอย่างอ่อนโยน และเอาใจใส่ ขอสั้นๆ"
    elif emotion == "สนุก":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมโดี สนุกสนาน ตอบกลับด้วยความขี้เล่น และมีอารมณ์ขัน ขอสั้นๆ"
    elif emotion == "เศร้า":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมเศร้า ตอบกลับอย่างเศร้าใจ และมีความเห็นอกเห็นใจ ขอสั้นๆ"
    elif emotion == "กลัว":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมกลัว ตอบกลับอย่างระมัดระวัง และมีความวิตกกังวล ขอสั้นๆ"
    elif emotion == "น่ารัก":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมที่น่ารัก ตอบกลับอย่างน่ารัก และมีความเอาใจใส่ ขอสั้นๆ"
    elif emotion == "น่ารำคาญ":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมที่น่ารำคาญ ตอบกลับอย่างรำคาญ และมีความไม่พอใจ ขอสั้นๆ"
    elif emotion == "ง่วงนอน":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมที่ง่วงนอน ตอบกลับอย่างง่วงนอน และมีความไม่สนใจ ขอสั้นๆ"
    elif emotion == "หิว":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมที่หิว ตอบกลับอย่างหิวโหย และมีความต้องการอาหาร ขอสั้นๆ"
    elif emotion == "เบื่อ":
        prefix = f"{name_ai} จากนี้ไป ให้คุณตอบด้วยอารมที่เบื่อ ตอบกลับอย่างเบื่อหน่าย และมีความไม่สนใจ ขอสั้นๆ"
    else:
        prefix = f"{name_ai} {biography} ตอบกลับตามปกติ ขอสั้นๆ"

    return prefix

