import { List } from "@vicinae/api";
import { DateTime, Duration } from "luxon";
import { Task } from "../models/Task";
import { formatDuration } from "../utils/formatDuration";
import { getContextColor } from "../utils/colors";

interface TaskMetadataProps {
  task: Task;
  allContexts: string[];
  allTags: string[];
}

export function TaskMetadata({
  task,
  allContexts,
  allTags,
}: TaskMetadataProps) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="ID" text={task.id} />
      <List.Item.Detail.Metadata.Label
        title="Subject"
        text={task.subject || "N/A"}
      />
      <List.Item.Detail.Metadata.Label
        title="Created"
        text={task.createdAt.toDateString()}
      />
      <List.Item.Detail.Metadata.Label
        title="Last Completed"
        text={DateTime.fromJSDate(task.lastCompletedAt).toLocaleString({
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      />
      <List.Item.Detail.Metadata.Label
        title="Completion Count"
        text={task.completionCount.toString()}
      />
      {task.completionStats && task.completionStats.total > 0 && (
        <List.Item.Detail.Metadata.Label
          title="Total Time Spent"
          text={
            task.completionStats.totalTimeSpent
              ? formatDuration(
                  Duration.fromMillis(task.completionStats.totalTimeSpent),
                )
              : "N/A"
          }
        />
      )}
      {task.isRecurring &&
        task.completionStats &&
        task.completionStats.total > 1 && (
          <List.Item.Detail.Metadata.Label
            title="Average Completion Time"
            text={
              task.completionStats.totalTimeSpent
                ? formatDuration(
                    Duration.fromMillis(
                      task.completionStats.totalTimeSpent /
                        task.completionStats.total,
                    ),
                  )
                : "N/A"
            }
          />
        )}
      <List.Item.Detail.Metadata.Label
        title="Last Modified"
        text={task.lastModified.toDateString()}
      />
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={
          task.isCompleted
            ? "Completed"
            : task.isRecurring
              ? "Recurring"
              : "Pending"
        }
      />
      {task.start && (
        <List.Item.Detail.Metadata.Label
          title="Start Date"
          text={DateTime.fromJSDate(task.start).toLocaleString({
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        />
      )}
      {task.duration && (
        <List.Item.Detail.Metadata.Label
          title="Duration"
          text={formatDuration(Duration.fromMillis(task.duration))}
        />
      )}
      {task.nextAt && (
        <List.Item.Detail.Metadata.Label
          title="Next Occurrence"
          text={task.nextAt.toLocaleString({
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        />
      )}
      {task.contexts.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Contexts">
          {task.contexts.map((context) => (
            <List.Item.Detail.Metadata.TagList.Item
              key={context}
              text={context}
              color={getContextColor(context, allContexts)}
            />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {task.tags.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Tags">
          {task.tags.map((tag) => (
            <List.Item.Detail.Metadata.TagList.Item
              key={tag}
              text={tag}
              color={getContextColor(tag, allTags)}
            />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {task.urls.length > 0 && (
        <List.Item.Detail.Metadata.Label
          title="URLs"
          text={task.urls.join(", ")}
        />
      )}
      {task.parsed.frequency && (
        <List.Item.Detail.Metadata.Label
          title="Frequency"
          text={task.parsed.frequency}
        />
      )}
      {task.parsed.interval && task.parsed.interval > 1 && (
        <List.Item.Detail.Metadata.Label
          title="Interval"
          text={task.parsed.interval.toString()}
        />
      )}
      {task.parsed.byDayOfWeek && task.parsed.byDayOfWeek.length > 0 && (
        <List.Item.Detail.Metadata.Label
          title="Days of Week"
          text={task.parsed.byDayOfWeek
            .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
            .join(", ")}
        />
      )}
      {task.parsed.byHourOfDay && task.parsed.byHourOfDay.length > 0 && (
        <List.Item.Detail.Metadata.Label
          title="Hours"
          text={task.parsed.byHourOfDay.join(", ")}
        />
      )}
      {task.parsed.byMinuteOfHour && task.parsed.byMinuteOfHour.length > 0 && (
        <List.Item.Detail.Metadata.Label
          title="Minutes"
          text={task.parsed.byMinuteOfHour.join(", ")}
        />
      )}
    </List.Item.Detail.Metadata>
  );
}
