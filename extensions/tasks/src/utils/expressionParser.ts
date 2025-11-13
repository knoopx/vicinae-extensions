import peggy from "peggy";
import { getHoursOfDay, getWeekendDays } from "../constants";

// Compile the grammar
const grammar = `
{
  function mergeObjects(...objects) {
    return objects.reduce((acc, curr) => {
      if (typeof curr === 'object' && curr !== null) {
        for (const key in curr) {
          if (Array.isArray(acc[key]) && Array.isArray(curr[key])) {
            acc[key] = Array.from(new Set([...acc[key], ...curr[key]]));
          } else if (acc[key] === undefined) {
            acc[key] = curr[key];
          }
        }
      }
      return acc;
    }, {});
  }

  const now = new Date()
  const hours = options.hours
  const weekendDays = options.weekendDays
}

Root
  = _* head:Expr tail:(_ Expr)* _* { return tail.length > 0 ? mergeObjects(head, ...tail.map(t => t[1])) : head }
  / _* { return {} }

Expr
  = ContextOrTagExpr / NaturalTimeExpr / Subject

_ "space"
  = [ ]+

URL
  = "http"i "s"? "://" (!(_ (ContextOrTagExpr / NaturalTimeExpr)) !_ .)+ { return text() }

Subject
  = head:(Word / URL) tail:(_ !ContextOrTagExpr !NaturalTimeExpr (Word / URL))* {
    const parts = [head, ...tail.map(t => t[3] || t[1])];
    const subjectParts = [];
    const urls = [];
    for (const part of parts) {
      if (typeof part === 'string') {
        if (part.includes('http://') || part.includes('https://')) {
          urls.push(part);
        } else {
          subjectParts.push(part);
        }
      }
    }
    return { subject: subjectParts.join(' ').trim(), urls };
  }

ContextOrTagExpr
  = head:(Context / TagExpr ) tail:(_ (Context / TagExpr))* { return mergeObjects(head, ...tail.map(t => t[1])) }

Context
  = "@" tail:(!"@" Char)* { return { contexts: [tail.map(x => x[1]).join("")] } }

Tag
  = "#" tail:(!"#" Char)* { return { tags: [tail.map(x => x[1]).join("")] } }

TagExpr
  = head:Tag tail:(_ Tag)*  {
    return { tags: [...head.tags, ...tail.flatMap(t => t[1].tags)] }
  }

Number "number"
  = [0-9]+ { return Number(text()) }

NumberOneTextual = "one"i { return 1 } / "an"i { return 1 } / "a"i { return 1 }
NumberTwoTextual = "two"i { return 2 }
NumberThreeTextual = "three"i { return 3 }
NumberFourTextual = "four"i { return 4 }
NumberFiveTextual = "five"i { return 5 }
NumberSixTextual = "six"i { return 6 }
NumberSevenTextual = "seven"i { return 7 }
NumberEightTextual = "eight"i { return 8 }
NumberNineTextual = "nine"i { return 9 }
NumberTenTextual = "ten"i { return 10 }
NumberElevenTextual = "eleven"i { return 11 }
NumberTwelveTextual = "twelve"i { return 12 }

NumberTextualExpr "one..twelve"
  = NumberOneTextual
  / NumberTwoTextual
  / NumberThreeTextual
  / NumberFourTextual
  / NumberFiveTextual
  / NumberSixTextual
  / NumberSevenTextual
  / NumberEightTextual
  / NumberNineTextual
  / NumberTenTextual
  / NumberElevenTextual
  / NumberTwelveTextual

NumberExpr
  = Number
  / NumberTextualExpr

NumberOneExpr
  = (NumberOneTextual / "1") { return  1 }

Char "char"
  = !(_) . { return text() }

Word "word"
  = Char Char* { return text() }

DurationUnit
  = "minute"i { return "minutes" }
  / "hour"i { return "hours" }
  / "day"i { return "days" }
  / "week"i { return "weeks" }
  / "month"i { return "months" }
  / "year"i { return "years" }

DurationUnitShort
  = "min"i { return "minutes" }
  / "h"i { return "hours" }
  / "d"i { return "days" }
  / "w"i { return "weeks" }
  / "mo"i { return "months" }
  / "y"i { return "years" }

DurationUnitPlural = expr:DurationUnit "s"i { return text() }

DurationUnitExpr = DurationUnitPlural / DurationUnit / DurationUnitShort

NaturalTimeExpr
  = EveryExpr
  / start:DateTimeExpr _ _for:ForExpr { return { start, duration: _for.duration } }
  / start:DateTimeExpr { return { start } }
  / at:TimeOfTheDay { return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), at.hour, at.minute) } }
  / InExpr
  / at:AtTimeExpr { return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), at.hour, at.minute) } }
  / ForExpr

EveryExpr
  = "every"i _ expr:EverySubExpr { return expr }

EverySubExpr
  = RecurringExpr

RecurringExpr
  = RecurringTimeOfTheDayExpr { return { frequency: "DAILY", ...arguments[0] } }
  / RecurringDayOfTheWeekExpr
  / RecurringWeekend
  / RecurringDurationUnit

RecurringTimeOfTheDay
  = expr:TimeOfTheDay {
    return {
      byHourOfDay: [expr.hour],
      byMinuteOfHour: [expr.minute]
    }
  }

RecurringTimeOfTheDayExpr
  = head:RecurringTimeOfTheDay tail:(_ "and"i _ RecurringTimeOfTheDay)* { return mergeObjects(head, ...tail.map(t => t[3])) }

RecurringDayOfTheWeek
  = dayName:DayOfTheWeek {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    return { frequency: "WEEKLY", byDayOfWeek: [days.indexOf(dayName.toLowerCase())] }
  }

RecurringDayOfTheWeekExpr
  = head:RecurringDayOfTheWeek tail:(_ "and"i _ RecurringDayOfTheWeek)* {
    return mergeObjects(head, ...tail.map(t => t[3]))
  }

RecurringWeekend = "weekend"i { return { frequency: "WEEKLY", byDayOfWeek: weekendDays } }
RecurringDurationUnit = expr:DurationUnitExpr { return { frequency: expr.toUpperCase().slice(0, -1), interval: 1 } }

InExpr
  = "in"i _ duration:DurationExpr { return { start: new Date(now.getTime() + duration.milliseconds) } }

ForExpr
  = "for"i _ expr:DurationExpr { return { duration: expr } }

TimeOfTheDay
  = "morning"i { return { hour: hours.morning, minute: 0 } }
  / "afternoon"i { return { hour: hours.afternoon, minute: 0 } }
  / "evening"i { return { hour: hours.evening, minute: 0 } }
  / "night"i { return { hour: hours.night, minute: 0 } }

AfterTimeOfTheDay
  = "after"i _ "wake up"i { return { hour: hours.morning, minute: 0 } }
  / "after"i _ "lunch"i { return { hour: hours.afternoon, minute: 0 } }
  / "after"i _ "work"i { return { hour: hours.evening, minute: 0 } }
  / "after"i _ "diner"i { return { hour: hours.night, minute: 0 } }

AtTimeExpr
  = AfterTimeOfTheDay
  / TimeOfTheDay
  / "at"i _ expr:TimeExpr { return expr }

TimeExpr
  = TimeOfTheDay
  / Time

NextExpr
  = "next"i _ expr:NextSubExpr { return expr }

NextSubExpr
  = "week"i { return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
  / "month"i { return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
  / "year"i { return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) }
  / dayName:DayOfTheWeek {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const targetDay = days.indexOf(dayName.toLowerCase());
    const currentDay = now.getDay();
    const daysUntil = (targetDay - currentDay + 7) % 7;
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    return nextDate;
  }

DateExpr
  = NextExpr
  / "this"i _ "weekend"i {
    const currentDay = now.getDay();
    const daysUntilSaturday = (6 - currentDay + 7) % 7;
    const weekendDate = new Date(now);
    weekendDate.setDate(now.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
    return weekendDate;
  }
  / "today"i { return new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
  / "tomorrow"i { return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
  / Date

DateTimeExpr
  = left:DateExpr _ right:AtTimeExpr { return new Date(left.getFullYear(), left.getMonth(), left.getDate(), right.hour, right.minute) }
  / expr:DateExpr { return expr }

DayNumber "0..31"
  = ("3" [0-1] / [0-2] [0-9] / [0-9]) { return Number(text()) }

DayOfTheWeek "monday...sunday"
  = name:("monday"i / "tuesday"i / "wednesday"i / "thursday"i / "friday"i / "saturday"i / "sunday"i) { return name }

MonthNumber "0..12"
  = ("1" [0-2] / "0"? [0-9]) {  return Number(text()) }

MonthNameShort "feb..dec"
  = name:("jan"i / "feb"i / "mar"i / "apr"i / "may"i / "jun"i / "jul"i / "aug"i / "sep"i / "oct"i / "nov"i / "dec"i) { return name }

MonthName "february..december"
  = name:("january"i / "february"i / "march"i / "april"i / "may"i / "june"i / "july"i / "august"i / "september"i / "october"i / "november"i / "december"i) { return name }

MonthNameAsNumber
  = name:MonthName { return ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(name.toLowerCase()) + 1 }
  / name:MonthNameShort { return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(name.toLowerCase()) + 1 }

MonthExpr
  = MonthNameAsNumber
  / MonthNumber

Number4Digit "year number"
  = [0-9][0-9][0-9][0-9] { return Number(text()) }

NumberUpTo12 "0..12"
  = ("1"[0-2] / "1" [0-9] / "0"? [0-9]) { return Number(text()) }

NumberUpTo24 "0..24"
  = ("2"[0-4] / "1"[0-9] / "0"? [0-9]) { return Number(text()) }

NumberUpTo59 "00..59"
  = ([1-5][0-9] / "0"[0-9] ) { return Number(text()) }

Hour24Abbr "(n)h"
  = hour:NumberUpTo24 _ "h"i { return { hour, minute: 0 } }
  / hour:NumberUpTo24 "h"i { return { hour, minute: 0 } }
  / hour:NumberUpTo24 { return { hour, minute: 0 } }

Hour12  "(n){am,pm}"
  = hour:NumberUpTo12 _? "am"i  { return { hour, minute: 0 } }
  / hour:NumberUpTo12 _? "pm"i  { return { hour: hour + 12, minute: 0 } }

TimeLong24 "0..24:0..59"
  = hour:NumberUpTo24 ":" minute:NumberUpTo59 { return { hour, minute } }

TimeLong12 "0..12:0..59"
  = hour:NumberUpTo12 ":" minute:NumberUpTo59 _? "am"i { return { hour, minute } }
  / hour:NumberUpTo12 ":" minute:NumberUpTo59 _? "pm"i { return { hour: hour + 12, minute } }

Time
  = TimeLong12 / TimeLong24 / Hour12 / Hour24Abbr

Date
  = day:DayNumber "/" month:MonthExpr "/" year:Number4Digit  { return new Date(year, month - 1, day)  }
  / day:DayNumber _ month:MonthExpr _ year:Number4Digit  { return new Date(year, month - 1, day)  }

Duration
  = value:NumberOneExpr _ unit:DurationUnit  { return { value, unit } }
  / value:NumberExpr _ unit:DurationUnitPlural  { return { value, unit } }
  / value:NumberExpr _* unit:DurationUnitShort  { return { value, unit } }

DurationExpr
  = duration:Duration  {
    const multipliers = {
      'minutes': 60 * 1000,
      'hours': 60 * 60 * 1000,
      'days': 24 * 60 * 60 * 1000,
      'weeks': 7 * 24 * 60 * 60 * 1000,
      'months': 30 * 24 * 60 * 60 * 1000,
      'years': 365 * 24 * 60 * 60 * 1000,
    };
    return { milliseconds: duration.value * multipliers[duration.unit] };
  }
`;

// Compile the parser
const parser = peggy.generate(grammar);

// Expression parser for task expressions
// Supports the full PEG.js grammar syntax

export interface ParsedExpression {
  subject: string;
  contexts: string[];
  tags: string[];
  urls: string[];
  start?: Date;
  duration?: { milliseconds: number };
  frequency?: string;
  byHourOfDay?: number[];
  byMinuteOfHour?: number[];
  byDayOfWeek?: number[];
  interval?: number;
}

export function parseExpression(text: string): ParsedExpression {
  try {
    const result = parser.parse(text.trim(), {
      grammarSource: "",
      startRule: "Root",
      hours: getHoursOfDay(),
      weekendDays: getWeekendDays(),
    });

    return {
      subject: result.subject || "",
      contexts: result.contexts || [],
      tags: result.tags || [],
      urls: result.urls || [],
      start: result.start,
      duration: result.duration,
      frequency: result.frequency,
      byHourOfDay: result.byHourOfDay,
      byMinuteOfHour: result.byMinuteOfHour,
      byDayOfWeek: result.byDayOfWeek,
      interval: result.interval,
    };
  } catch {
    // If parsing fails, return a basic result with just the subject
    return {
      subject: text.trim(),
      contexts: [],
      tags: [],
      urls: [],
    };
  }
}
