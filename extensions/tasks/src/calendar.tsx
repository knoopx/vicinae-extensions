import { List, ActionPanel, Action, Icon } from "@vicinae/api";
import { useState } from "react";
import { DateTime, Duration } from "luxon";
import { formatDuration } from "./utils/formatDuration";
import { emojiFromKeyword } from "./utils/emojiFromKeyword";
import { useTasks } from "./hooks/useTasks";
import { toDistanceExpr } from "./utils/toDistanceExpr";
import { now } from "./utils/now";

export default function CalendarCommand() {
  const [currentMonth, setCurrentMonth] = useState(
    now().startOf("month"),
  );
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const { tasks, isLoading } = useTasks();

  const monthName = currentMonth.toFormat("MMMM yyyy");
  const yearName = currentMonth.toFormat("yyyy");

  const daysInMonth = currentMonth.daysInMonth;

  const days = [];
  if (daysInMonth) {
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(currentMonth.set({ day: i }));
    }
  }

  // Get tasks for selected date or today
  const tasksForSelectedDate = selectedDate
    ? tasks.filter((task) => {
        if (!task.nextAt) return false;
        return task.nextAt.hasSame(selectedDate, "day");
      })
    : [];

  // Group tasks by their next occurrence date
  const getTasksForDay = (day: DateTime) => {
    return tasks.filter((task) => {
      if (!task.nextAt) return false;
      return task.nextAt.hasSame(day, "day");
    });
  };

  // Get overdue tasks (tasks that should have been completed but aren't)
  const getOverdueTasks = () => {
    const currentTime = now();
    return tasks.filter((task) => {
      if (task.isCompleted) return false;
      if (!task.nextAt) return false;
      return task.nextAt < currentTime;
    });
  };

  // Get today's tasks
  const getTodayTasks = () => {
    const today = now().startOf("day");
    return getTasksForDay(today);
  };

  const overdueTasks = getOverdueTasks();
  const todayTasks = getTodayTasks();

  if (isLoading) {
    return <List isLoading={true} />;
  }

  return (
    <List>
      {/* Overdue Tasks Section */}
      {overdueTasks.length > 0 && (
        <List.Section title="Overdue" subtitle={`${overdueTasks.length} tasks`}>
          {overdueTasks.slice(0, 5).map((task) => {
            const contextEmojis = [...task.contexts, ...task.tags]
              .map((x) => emojiFromKeyword(x))
              .filter((x) => x !== undefined) as string[];

            const titleWithEmoji =
              contextEmojis.length > 0
                ? `${contextEmojis[0]} ${task.subject || task.expression}`
                : task.subject || task.expression;

            return (
              <List.Item
                key={`overdue-${task.id}`}
                title={titleWithEmoji}
                subtitle={task.nextAt ? `Due ${task.nextAt.toRelative()}` : undefined}
                icon={Icon.ExclamationMark}
                accessories={[
                  ...(task.isRecurring ? [{ icon: Icon.Repeat }] : []),
                  ...(task.duration
                    ? [{ icon: Icon.Stopwatch, text: formatDuration(Duration.fromMillis(task.duration)) }]
                    : []),
                ]}
              />
            );
          })}
          {overdueTasks.length > 5 && (
            <List.Item
              title={`... and ${overdueTasks.length - 5} more overdue tasks`}
              icon={Icon.Ellipsis}
            />
          )}
        </List.Section>
      )}

      {/* Today's Tasks Section */}
      {todayTasks.length > 0 && (
        <List.Section title="Today" subtitle={`${todayTasks.length} tasks`}>
          {todayTasks.map((task) => {
            const contextEmojis = [...task.contexts, ...task.tags]
              .map((x) => emojiFromKeyword(x))
              .filter((x) => x !== undefined) as string[];

            const titleWithEmoji =
              contextEmojis.length > 0
                ? `${contextEmojis[0]} ${task.subject || task.expression}`
                : task.subject || task.expression;

            return (
              <List.Item
                key={`today-${task.id}`}
                title={titleWithEmoji}
                subtitle={task.nextAt ? task.nextAt.toFormat("HH:mm") : undefined}
                icon={task.isCompleted ? Icon.CheckCircle : Icon.Circle}
                accessories={[
                  ...(task.isRecurring ? [{ icon: Icon.Repeat }] : []),
                  ...(task.duration
                    ? [{ icon: Icon.Stopwatch, text: formatDuration(Duration.fromMillis(task.duration)) }]
                    : []),
                ]}
              />
            );
          })}
        </List.Section>
      )}

      {/* Year Navigation */}
      <List.Item
        title={yearName}
        subtitle="Year navigation"
        icon={Icon.Calendar}
        actions={
          <ActionPanel>
            <Action
              title="Previous Year"
              onAction={() =>
                setCurrentMonth(currentMonth.minus({ years: 1 }))
              }
              icon={Icon.ChevronLeft}
            />
            <Action
              title="Next Year"
              onAction={() => setCurrentMonth(currentMonth.plus({ years: 1 }))}
              icon={Icon.ChevronRight}
            />
            <Action
              title="Current Year"
              onAction={() => setCurrentMonth(now().startOf("month"))}
              icon={Icon.Calendar}
            />
          </ActionPanel>
        }
      />

      {/* Month Navigation */}
      <List.Item
        title={monthName}
        subtitle={`${days.length} days, ${tasks.filter(t => t.nextAt && t.nextAt >= currentMonth.startOf('month') && t.nextAt <= currentMonth.endOf('month')).length} scheduled tasks`}
        icon={Icon.Calendar}
        actions={
          <ActionPanel>
            <Action
              title="Previous Month"
              onAction={() =>
                setCurrentMonth(currentMonth.minus({ months: 1 }))
              }
              icon={Icon.ChevronLeft}
            />
            <Action
              title="Next Month"
              onAction={() => setCurrentMonth(currentMonth.plus({ months: 1 }))}
              icon={Icon.ChevronRight}
            />
            <Action
              title="Current Month"
              onAction={() => setCurrentMonth(now().startOf("month"))}
              icon={Icon.Calendar}
            />
          </ActionPanel>
        }
      />

      {/* Selected Date Display */}
      {selectedDate && tasksForSelectedDate.length > 0 && (
        <List.Section title={`Tasks for ${selectedDate.toFormat("EEEE, MMMM d")}`}>
          {tasksForSelectedDate.map((task) => {
            const contextEmojis = [...task.contexts, ...task.tags]
              .map((x) => emojiFromKeyword(x))
              .filter((x) => x !== undefined) as string[];

            const titleWithEmoji =
              contextEmojis.length > 0
                ? `${contextEmojis[0]} ${task.subject || task.expression}`
                : task.subject || task.expression;

            return (
              <List.Item
                key={`selected-${task.id}`}
                title={titleWithEmoji}
                subtitle={task.nextAt ? task.nextAt.toFormat("HH:mm") : undefined}
                icon={task.isCompleted ? Icon.CheckCircle : Icon.Circle}
                accessories={[
                  ...(task.isRecurring ? [{ icon: Icon.Repeat }] : []),
                  ...(task.duration
                    ? [{ icon: Icon.Stopwatch, text: formatDuration(Duration.fromMillis(task.duration)) }]
                    : []),
                ]}
              />
            );
          })}
        </List.Section>
      )}
      {days.map((day) => {
        const dayTasks = getTasksForDay(day);
        const isToday = day.hasSame(now(), "day");
        const isPast = day < now().startOf("day");
        const isSelected = selectedDate?.hasSame(day, "day");

        return (
          <List.Item
            key={day.toISODate()}
            title={day.toFormat("EEEE, MMMM d")}
            subtitle={
              dayTasks.length > 0
                ? `${dayTasks.length} task${dayTasks.length > 1 ? "s" : ""}`
                : isToday
                  ? "Today"
                  : isPast
                    ? "Past"
                    : undefined
            }
            icon={
              isSelected
                ? Icon.CheckCircle
                : isToday
                  ? Icon.Star
                  : isPast
                    ? Icon.Circle
                    : Icon.Clock
            }
            accessories={
              dayTasks.length > 0
                ? dayTasks.slice(0, 3).map((task) => {
                    // Get emojis from contexts and tags
                    const contextEmojis = [...task.contexts, ...task.tags]
                      .map((x) => emojiFromKeyword(x))
                      .filter((x) => x !== undefined) as string[];

                    const titleWithEmoji =
                      contextEmojis.length > 0
                        ? `${contextEmojis[0]} ${task.subject || task.expression}`
                        : task.subject || task.expression;

                    return {
                      text: titleWithEmoji,
                      icon: task.isRecurring
                        ? Icon.Repeat
                        : task.isCompleted
                          ? Icon.CheckCircle
                          : Icon.Circle,
                    };
                  })
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Deselect Date" : "Select Date"}
                  onAction={() => setSelectedDate(isSelected ? null : day)}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                />
                <Action
                  title="Go to Today"
                  onAction={() => setCurrentMonth(now().startOf("month"))}
                  icon={Icon.Calendar}
                />
              </ActionPanel>
            }
            detail={
              dayTasks.length > 0 ? (
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Date"
                        text={day.toFormat("EEEE, MMMM d, yyyy")}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Relative"
                        text={toDistanceExpr(now(), day) || "Today"}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      {dayTasks.map((task, index) => (
                        <div key={task.id}>
                          <List.Item.Detail.Metadata.Label
                            title={`Task ${index + 1}`}
                            text={task.subject || task.expression}
                          />
                          {task.nextAt && (
                            <List.Item.Detail.Metadata.Label
                              title="Time"
                              text={task.nextAt.toFormat("HH:mm")}
                            />
                          )}
                          {task.duration && (
                            <List.Item.Detail.Metadata.Label
                              title="Duration"
                              text={formatDuration(
                                Duration.fromMillis(task.duration),
                              )}
                            />
                          )}
                          {task.contexts.length > 0 && (
                            <List.Item.Detail.Metadata.TagList title="Contexts">
                              {task.contexts.map((context) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={context}
                                  text={context}
                                  color={Icon.Tag}
                                />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          {task.tags.length > 0 && (
                            <List.Item.Detail.Metadata.TagList title="Tags">
                              {task.tags.map((tag) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={tag}
                                  text={`#${tag}`}
                                  color={Icon.Tag}
                                />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          {task.urls.length > 0 && (
                            <List.Item.Detail.Metadata.Label
                              title="URLs"
                              text={task.urls.length.toString()}
                            />
                          )}
                          {task.isRecurring && (
                            <List.Item.Detail.Metadata.Label
                              title="Type"
                              text="Recurring"
                            />
                          )}
                          {index < dayTasks.length - 1 && (
                            <List.Item.Detail.Metadata.Separator />
                          )}
                        </div>
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : undefined
            }
          />
        );
      })}
    </List>
  );
}
