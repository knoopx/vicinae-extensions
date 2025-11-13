import { List } from "@vicinae/api";
import { DateTime, Duration } from "luxon";
import { formatDuration } from "../utils/formatDuration";
import { getContextColor } from "../utils/colors";
import type { ParsedExpression } from "../utils/expressionParser";

interface CreateTaskMetadataProps {
  parsedExpression: ParsedExpression;
  allContexts: string[];
  allTags: string[];
}

export function CreateTaskMetadata({
  parsedExpression,
  allContexts,
  allTags,
}: CreateTaskMetadataProps) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Type"
        text={parsedExpression?.frequency ? "Recurring" : "One-time"}
      />
      {parsedExpression?.start && (
        <List.Item.Detail.Metadata.Label
          title="Start"
          text={DateTime.fromJSDate(parsedExpression.start).toLocaleString({
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        />
      )}
      {parsedExpression?.duration && (
        <List.Item.Detail.Metadata.Label
          title="Duration"
          text={formatDuration(
            Duration.fromMillis(parsedExpression.duration.milliseconds),
          )}
        />
      )}
      {parsedExpression?.contexts && parsedExpression.contexts.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Contexts">
          {parsedExpression.contexts.map((context) => (
            <List.Item.Detail.Metadata.TagList.Item
              key={context}
              text={context}
              color={getContextColor(context, allContexts)}
            />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {parsedExpression?.tags && parsedExpression.tags.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Tags">
          {parsedExpression.tags.map((tag) => (
            <List.Item.Detail.Metadata.TagList.Item
              key={tag}
              text={tag}
              color={getContextColor(tag, allTags)}
            />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {parsedExpression?.urls && parsedExpression.urls.length > 0 && (
        <List.Item.Detail.Metadata.Label
          title="URLs"
          text={parsedExpression.urls.length.toString()}
        />
      )}
      {parsedExpression?.frequency && (
        <List.Item.Detail.Metadata.Label
          title="Frequency"
          text={parsedExpression.frequency}
        />
      )}
      {parsedExpression?.interval && parsedExpression.interval > 1 && (
        <List.Item.Detail.Metadata.Label
          title="Interval"
          text={parsedExpression.interval.toString()}
        />
      )}
      {parsedExpression?.byDayOfWeek &&
        parsedExpression.byDayOfWeek.length > 0 && (
          <List.Item.Detail.Metadata.Label
            title="Days of Week"
            text={parsedExpression.byDayOfWeek
              .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
              .join(", ")}
          />
        )}
      {parsedExpression?.byHourOfDay &&
        parsedExpression.byHourOfDay.length > 0 && (
          <List.Item.Detail.Metadata.Label
            title="Hours"
            text={parsedExpression.byHourOfDay.join(", ")}
          />
        )}
      {parsedExpression?.byMinuteOfHour &&
        parsedExpression.byMinuteOfHour.length > 0 && (
          <List.Item.Detail.Metadata.Label
            title="Minutes"
            text={parsedExpression.byMinuteOfHour.join(", ")}
          />
        )}
    </List.Item.Detail.Metadata>
  );
}
