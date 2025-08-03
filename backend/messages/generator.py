import random
import time

MESSAGES = [
    "โกรธ!",
    "เหงา",
    "งง",
    "ร่าเริง",
    "รำคาญ?",
    "ยิ้มหน่อย 😊",
]

def random_message_generator():
    while True:
        message = random.choice(MESSAGES)
        print(f"Generated message: {message}")  # Debugging output
        yield message
        time.sleep(10000)
