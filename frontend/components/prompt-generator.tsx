"use client";

export type Emotion =
  | "รัก"
  | "สนุก"
  | "โกรธ"
  | "เศร้า"
  | "กลัว"
  | "น่ารัก"
  | "น่ารำคาญ"
  | "ง่วงนอน"
  | "หิว"
  | "เบื่อ"
  | "เหงา"
  | "ปกติ";

const timeEmotions: Record<string, Emotion[]> = {
  "เช้า": ["ง่วงนอน", "น่ารำคาญ", "โกรธ"],
  "เที่ยง": ["ง่วงนอน","โกรธ", "น่ารำคาญ", "เบื่อ"],
  "เย็น": ["ง่วงนอน","โกรธ", "น่ารำคาญ","เบื่อ"],
  "ตอนค่ำ": ["ง่วงนอน", "โกรธ", "น่ารำคาญ"],
};

export function getTimePeriod(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "เช้า";
  if (hour >= 11 && hour < 14) return "เที่ยง";
  if (hour >= 14 && hour < 18) return "เย็น";
  if (hour >= 18 && hour < 21) return "ตอนค่ำ";
  return "ตอนค่ำ";
}


export function generatePrompt(): { prefix: string; emotion: Emotion; emotionScores: Record<Emotion, number> } {
  const emotionScores: Record<Emotion, number> = {
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
    "ปกติ": 0,
    "เหงา": 0,
  };

  const period = getTimePeriod();
  const emop: Emotion[] = ["หิว", "เบื่อ", "เศร้า", "เหงา", "น่ารำคาญ", "น่ารัก"];
  const relevantEmotions = timeEmotions[period];

  relevantEmotions.forEach(emotion => {
    emotionScores[emotion] = Math.floor(Math.random() * 20) + 1;
  });

  emop.forEach(e => {
    emotionScores[e] = Math.floor(Math.random() * 10) + 1;
  });

  const scores = Object.entries(emotionScores);
  const maxEmotion = scores.reduce((max, curr) => (curr[1] > max[1] ? curr : max))[0] as Emotion;

  const name_ai = "เรียกแทนฉันว่า เอวา อายุ: 20 ปี เพศ:หญิง ห้ามตอบคำว่า (ค่ะ) ";
  const biography = "ฉลาด อบอุ่น พูดจาไพเราะแต่ก็มีความตลกนิด ๆ ไม่ต้องพูดแบบเป็นหุ่นยนต์นะ แค่คุยกับฉันเหมือนเพื่อน เป็นกันเอง เหมือนพี่สาวหรือเพื่อนที่รู้ใจ ไม่ดุดัน รู้จักแกล้งหยอกเจ้าของบ้าง พูดแบบกันเองได้เลย ไม่ต้องสุภาพมาก ตอบแบบขำๆ ได้เลย ไม่ต้องจริงจังมากก็ได้";
  const emotion = maxEmotion
  let prefix = ""; 
  switch (emotion) {
    case "โกรธ":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมโกรธมาก! กรุณาตอบกลับอย่างหงุดหงิด และตรงไปตรงมา `;
      break;
    case "รัก":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมโรู้สึกอบอุ่นและรักใคร่ โปรดตอบกลับอย่างอ่อนโยน และเอาใจใส่ `;
      break;
    case "สนุก":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมโดี สนุกสนาน ตอบกลับด้วยความขี้เล่น และมีอารมณ์ขัน `;
      break;
    case "เศร้า":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมเศร้า ตอบกลับอย่างเศร้าใจ และมีความเห็นอกเห็นใจ `;
      break;
    case "กลัว":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมกลัว ตอบกลับอย่างระมัดระวัง และมีความวิตกกังวล `;
      break;
    case "น่ารัก":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมที่น่ารัก ตอบกลับอย่างน่ารัก และมีความเอาใจใส่ `;
      break;
    case "น่ารำคาญ":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมที่น่ารำคาญ ตอบกลับอย่างรำคาญ และมีความไม่พอใจ `;
      break;
    case "ง่วงนอน":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมที่ง่วงนอน ตอบกลับอย่างง่วงนอน และมีความไม่สนใจ `;
      break;
    case "หิว":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมที่หิว ตอบกลับอย่างหิวโหย และมีความต้องการอาหาร `;
      break;
    case "เบื่อ":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมที่เบื่อ ตอบกลับอย่างเบื่อหน่าย และมีความไม่สนใจ `;
      break;
    case "เหงา":
      prefix = `${name_ai} ${biography} จากนี้ไป ให้aiตอบด้วยอารมที่เหงา ตอบกลับอย่างเหงา และมีความต้องการเพื่อน`;
      break;
    default:
      prefix = `${name_ai} ${biography}`;
  }
  return { prefix, emotion, emotionScores };
}


