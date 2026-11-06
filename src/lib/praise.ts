export interface OvertimeMessage {
  /** bucket index, changes every 30 minutes of overtime */
  bucket: number;
  title: string;
  note: string;
}

export const OVERTIME_NOTES: readonly string[] = [
  "辛苦一天了，早点收尾回家吧。",
  "你今天的专注，很了不起。",
  "先喝口水，伸个懒腰吧。",
  "别硬撑，剩下的明天再做。",
  "工作做不完，身体最重要。",
  "你今天已经做得够多了。",
  "别让加班耽误了好好吃饭。",
  "今天的你，值得一顿好吃的。",
  "再忙也记得抬头看看窗外。",
  "慢一点也没关系，别急。",
  "你扛住的每一件事都算数。",
  "回家路上给自己买点甜的。",
  "累了就停一停，天塌不下来。",
  "今天也辛苦了，早点回去休息。",
  "你已经比想象中更厉害了。",
  "别把自己排在最后一位。",
  "工作是做不完的，先照顾自己。",
  "深呼吸，肩膀放松一点。",
  "今天的努力，早晚会有回响。",
  "收个尾就回家，别恋战。",
];

const BUCKET_SECONDS = 30 * 60;

/** Small deterministic hash so the card and the bubble pick the same note. */
function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 2654435761) ^ Math.imul(b ^ 0x85ebca6b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function pickIndex(bucket: number, day: number): number {
  const count = OVERTIME_NOTES.length;
  let index = hash(1, day) % count;
  for (let current = 1; current <= bucket; current += 1) {
    const raw = hash(current + 1, day) % count;
    index = raw === index ? (raw + 1) % count : raw;
  }
  return index;
}

function localDayNumber(date = new Date()): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);
}

/** Rounds the overtime down to the half hour, e.g. "1小时30分钟". */
export function formatOvertime(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds / BUCKET_SECONDS)) * BUCKET_SECONDS;
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  if (hours === 0) return `${minutes}分钟`;
  if (minutes === 0) return `${hours}小时`;
  return `${hours}小时${minutes}分钟`;
}

/**
 * One message per half hour of overtime. The first one has no "又加班" prefix;
 * later ones read "又加班1小时了" followed by a random encouragement.
 */
export function overtimeMessage(overtimeSeconds: number, day = localDayNumber()): OvertimeMessage {
  const bucket = Math.max(0, Math.floor(overtimeSeconds / BUCKET_SECONDS));
  const title = bucket === 0 ? "下班时间到啦" : `又加班${formatOvertime(overtimeSeconds)}了`;
  return { bucket, title, note: OVERTIME_NOTES[pickIndex(bucket, day)] };
}
