import { describe, expect, it } from "vitest";
import { OVERTIME_NOTES, formatOvertime, overtimeMessage } from "./praise";

const HALF_HOUR = 30 * 60;

describe("formatOvertime", () => {
  it("rounds down to the half hour", () => {
    expect(formatOvertime(0)).toBe("0分钟");
    expect(formatOvertime(HALF_HOUR)).toBe("30分钟");
    expect(formatOvertime(HALF_HOUR * 2)).toBe("1小时");
    expect(formatOvertime(HALF_HOUR * 3)).toBe("1小时30分钟");
    expect(formatOvertime(HALF_HOUR * 4 + 125)).toBe("2小时");
  });
});

describe("overtimeMessage", () => {
  it("starts with the plain off-work title", () => {
    const message = overtimeMessage(0, 100);
    expect(message.bucket).toBe(0);
    expect(message.title).toBe("下班时间到啦");
    expect(OVERTIME_NOTES).toContain(message.note);
  });

  it("prefixes later prompts with the overtime duration", () => {
    expect(overtimeMessage(HALF_HOUR, 100).title).toBe("又加班30分钟了");
    expect(overtimeMessage(HALF_HOUR * 2, 100).title).toBe("又加班1小时了");
    expect(overtimeMessage(HALF_HOUR * 3, 100).title).toBe("又加班1小时30分钟了");
  });

  it("is stable for the same bucket and day", () => {
    expect(overtimeMessage(HALF_HOUR * 2, 100)).toEqual(overtimeMessage(HALF_HOUR * 2 + 60, 100));
  });

  it("never repeats the previous note back to back", () => {
    for (let bucket = 1; bucket < 60; bucket += 1) {
      const previous = overtimeMessage(bucket * HALF_HOUR - 1, 100);
      const current = overtimeMessage(bucket * HALF_HOUR, 100);
      expect(current.note).not.toBe(previous.note);
    }
  });

  it("does not simply rotate through the list", () => {
    const indexes = Array.from({ length: 20 }, (_, bucket) =>
      OVERTIME_NOTES.indexOf(overtimeMessage(bucket * HALF_HOUR, 100).note),
    );
    const rotation = indexes.map((_, bucket) => bucket % OVERTIME_NOTES.length);
    expect(indexes).not.toEqual(rotation);
  });

  it("has twenty notes and never returns a negative bucket", () => {
    expect(OVERTIME_NOTES).toHaveLength(20);
    expect(overtimeMessage(-10, 100).bucket).toBe(0);
  });
});
