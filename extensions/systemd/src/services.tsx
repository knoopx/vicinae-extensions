import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@vicinae/api";
import {
  listServices,
  startService,
  stopService,
  restartService,
  reloadService,
  enableService,
  disableService,
  getServiceLogs,
} from "./systemctl";
import { getServiceIcon, getServiceColor, ServiceStatus } from "./patterns";
import type { Service } from "./systemctl";

// Custom hook for managing services
function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async (): Promise<Service[]> => {
    try {
      const services = await listServices();

      // Add icons to services
      return services.map((service) => ({
        ...service,
        icon: getServiceIcon(),
      }));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch services",
      });
      console.error(error);
      return [];
    }
  }, []);

  const refreshServices = useCallback(async () => {
    setLoading(true);
    const newServices = await fetchServices();
    setServices(newServices);
    setLoading(false);
  }, [fetchServices]);

  useEffect(() => {
    refreshServices();
  }, [refreshServices]);

  return { services, loading, refreshServices };
}

// Service detail component
function ServiceDetail({ service }: { service: Service }) {
  const [logs, setLogs] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLogsLoading(true);
      try {
        const serviceLogs = await getServiceLogs(service.name, service.type);
        setLogs(serviceLogs);
      } catch {
        setLogs("Failed to load logs");
      } finally {
        setLogsLoading(false);
      }
    };

    fetchLogs();
  }, [service.name]);

  return (
    <List.Item.Detail
      markdown={
        logsLoading ? "Loading logs..." : logs.split("\n").join("<br/>")
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Service Name"
            text={service.name}
          />
          <List.Item.Detail.Metadata.Label
            title="Description"
            text={service.description}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={`${service.status} (${service.subStatus})`}
            icon={{
              source: service.icon,
              tintColor: getServiceColor(service.status),
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Load Status"
            text={service.loadStatus}
            icon={{
              source:
                service.loadStatus === "loaded"
                  ? Icon.CheckCircle
                  : Icon.XMarkCircle,
              tintColor:
                service.loadStatus === "loaded" ? Color.Green : Color.Red,
            }}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Action handler factory functions
function createServiceActionHandler(
  action: string,
  service: Service,
  refreshServices: () => Promise<void>
) {
  return async () => {
    try {
      switch (action) {
        case "start":
          await startService(service.name);
          break;
        case "stop":
          await stopService(service.name);
          break;
        case "restart":
          await restartService(service.name);
          break;
        case "reload":
          await reloadService(service.name);
          break;
        case "enable":
          await enableService(service.name);
          break;
        case "disable":
          await disableService(service.name);
          break;
        default:
          console.error(`Unknown action: ${action}`);
          await showToast({
            style: Toast.Style.Failure,
            title: "Unknown Action",
            message: `Unknown action: ${action}`,
          });
          return;
      }
    } catch (error) {
      console.error(`Failed to perform ${action} on ${service.name}:`, error);
    } finally {
      // Always refresh to get the latest state
      await refreshServices();
    }
  };
}

// Service list item component
function ServiceListItem({
  service,
  showingDetail,
  refreshServices,
  toggleDetails,
}: {
  service: Service;
  showingDetail: boolean;
  refreshServices: () => Promise<void>;
  toggleDetails: () => void;
}) {
  const tintColor = getServiceColor(service.status);

  return (
    <List.Item
      key={service.name}
      title={service.name}
      subtitle={service.description}
      icon={{ source: service.icon, tintColor }}
      accessories={
        !showingDetail
          ? [
              {
                icon: service.type === "system" ? Icon.Gear : Icon.Person,
                tooltip: `${service.type} service`,
              },
            ]
          : undefined
      }
      detail={showingDetail ? <ServiceDetail service={service} /> : undefined}
      actions={
        <ActionPanel>
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={toggleDetails}
          />
          {service.status === ServiceStatus.ACTIVE ? (
            <>
              <Action
                title="Stop"
                icon={Icon.Stop}
                style="destructive"
                shortcut={{ modifiers: ["ctrl"], key: "s" }}
                onAction={createServiceActionHandler(
                  "stop",
                  service,
                  refreshServices
                )}
              />
              <Action
                title="Restart"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["ctrl"], key: "r" }}
                onAction={createServiceActionHandler(
                  "restart",
                  service,
                  refreshServices
                )}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["ctrl"], key: "l" }}
                onAction={createServiceActionHandler(
                  "reload",
                  service,
                  refreshServices
                )}
              />
            </>
          ) : (
            <Action
              title="Start"
              icon={Icon.Play}
              shortcut={{ modifiers: ["ctrl"], key: "s" }}
              onAction={createServiceActionHandler(
                "start",
                service,
                refreshServices
              )}
            />
          )}
          <ActionPanel.Section>
            <Action
              title="Enable"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["ctrl"], key: "e" }}
              onAction={createServiceActionHandler(
                "enable",
                service,
                refreshServices
              )}
            />
            <Action
              title="Disable"
              icon={Icon.XMarkCircle}
              style="destructive"
              shortcut={{ modifiers: ["ctrl"], key: "d" }}
              onAction={createServiceActionHandler(
                "disable",
                service,
                refreshServices
              )}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Service filter type
type ServiceFilter = "all" | "system" | "user";

// Main component
export default function Services() {
  const { services, loading, refreshServices } = useServices();
  const [showingDetail, setShowingDetail] = useState(false);
  const [filter, setFilter] = useState<ServiceFilter>("all");

  const toggleDetails = useCallback(() => {
    setShowingDetail(!showingDetail);
  }, [showingDetail]);

  // Filter services based on selected filter
  const filteredServices = useMemo(() => {
    if (filter === "all") return services;

    return services.filter((service) => service.type === filter);
  }, [services, filter]);

  if (services.length === 0 && !loading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Gear}
          title="No Services Found"
          description="No systemd services available. This might indicate a permission issue or no services are loaded."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Services"
                icon={Icon.ArrowClockwise}
                onAction={refreshServices}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search services..."
      isShowingDetail={showingDetail}
    >
      <List.Dropdown
        tooltip="Filter services"
        value={filter}
        onChange={(value) => setFilter(value as ServiceFilter)}
      >
        <List.Dropdown.Item value="all" title="All Services" icon={Icon.List} />
        <List.Dropdown.Item
          value="system"
          title="System Services"
          icon={Icon.Gear}
        />
        <List.Dropdown.Item
          value="user"
          title="User Services"
          icon={Icon.Person}
        />
      </List.Dropdown>
      {filteredServices.map((service) => (
        <ServiceListItem
          key={`${service.name}-${service.type}`}
          service={service}
          showingDetail={showingDetail}
          refreshServices={refreshServices}
          toggleDetails={toggleDetails}
        />
      ))}
    </List>
  );
}
