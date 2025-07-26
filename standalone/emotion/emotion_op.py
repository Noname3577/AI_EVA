def get_main_emotion():
    emotion_scores = {
        "รัก": 1, 
        "สนุก": 3, 
        "โกรธ": 5
        }
    return max(emotion_scores, key=emotion_scores.get)
