import { DateTime } from "luxon";
import { ParsedExpression } from "../utils/expressionParser";
import { now } from "./now";

function toTimeExpr(hour: number, minute: number): string {
  if (minute === 0) {
    return hour.toString();
  } else {
    return `${hour}:${minute}`;
  }
}

function toDateExpr(date?: Date): string {
  if (!date) return "";

  const dt = DateTime.fromJSDate(date);
  if (dt.year === now().year) {
    return dt.toFormat("d LLLL").toLowerCase();
  }

  return dt.toFormat("dd/MM/yyyy");
}

function toAtTimeExpr(start?: Date): string {
  if (!start) return "";

  const dt = DateTime.fromJSDate(start);
  if (dt.hour == 0 && dt.minute == 0) {
    return "";
  }
  return `at ${toTimeExpr(dt.hour, dt.minute)}`;
}

export function toExpression(ast: ParsedExpression): string {
  const contexts = ast?.contexts
    ?.filter(Boolean)
    .map((tag: string) => `@${tag}`)
    .join(" ");
  const tags = ast?.tags
    ?.filter(Boolean)
    .map((tag: string) => `#${tag}`)
    .join(" ");
  const urls = ast?.urls?.join(" ");

  return [
    contexts,
    tags,
    ast.subject,
    ast.start ? [toDateExpr(ast.start), toAtTimeExpr(ast.start)] : "",
    urls,
  ]
    .flat()
    .filter(Boolean)
    .join(" ");
}