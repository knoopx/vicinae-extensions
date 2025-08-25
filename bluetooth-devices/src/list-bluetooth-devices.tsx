import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface BluetoothDevice {
  mac: string;
  name: string;
  connected: boolean;
  paired: boolean;
  trusted: boolean;
}

export default function Command() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDevices() {
    try {
      setIsLoading(true);

      // Get list of devices using bluetoothctl
      const { stdout } = await execAsync("bluetoothctl devices");

      const deviceList: BluetoothDevice[] = [];
      const lines = stdout.trim().split("\n");

      for (const line of lines) {
        if (line.trim()) {
          const match = line.match(/Device\s+([^\s]+)\s+(.+)/);
          if (match) {
            const [, mac, name] = match;
            deviceList.push({
              mac,
              name: name.trim(),
              connected: false,
              paired: false,
              trusted: false,
            });
          }
        }
      }

      // Get connection status for each device
      for (const device of deviceList) {
        try {
          const { stdout: infoOutput } = await execAsync(
            `bluetoothctl info ${device.mac}`,
          );
          device.connected = infoOutput.includes("Connected: yes");
          device.paired = infoOutput.includes("Paired: yes");
          device.trusted = infoOutput.includes("Trusted: yes");
        } catch {
          // Device info might fail, continue with defaults
        }
      }

      setDevices(deviceList);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load Bluetooth devices",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleConnection(device: BluetoothDevice) {
    try {
      const action = device.connected ? "disconnect" : "connect";
      await execAsync(`bluetoothctl ${action} ${device.mac}`);

      await showToast({
        style: Toast.Style.Success,
        title: `Device ${action}ed`,
        message: device.name,
      });

      // Reload devices to update status
      await loadDevices();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${device.connected ? "disconnect" : "connect"}`,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function toggleTrust(device: BluetoothDevice) {
    try {
      const action = device.trusted ? "untrust" : "trust";
      await execAsync(`bluetoothctl ${action} ${device.mac}`);

      await showToast({
        style: Toast.Style.Success,
        title: `Device ${action}ed`,
        message: device.name,
      });

      // Reload devices to update status
      await loadDevices();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${device.trusted ? "untrust" : "trust"}`,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function removeDevice(device: BluetoothDevice) {
    try {
      await execAsync(`bluetoothctl remove ${device.mac}`);

      await showToast({
        style: Toast.Style.Success,
        title: "Device removed",
        message: device.name,
      });

      // Reload devices to update list
      await loadDevices();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove device",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function pairDevice(device: BluetoothDevice) {
    try {
      await execAsync(`bluetoothctl pair ${device.mac}`);

      await showToast({
        style: Toast.Style.Success,
        title: "Pairing initiated",
        message: device.name,
      });

      // Reload devices to update status
      await loadDevices();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to pair device",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  return (
    <List isLoading={isLoading}>
      {devices.map((device) => (
        <List.Item
          key={device.mac}
          icon={device.connected ? Icon.Bluetooth : Icon.WifiDisabled}
          title={device.name}
          subtitle={device.mac}
          accessories={[
            { text: device.connected ? "Connected" : "Disconnected" },
            { text: device.paired ? "Paired" : "Unpaired" },
            { text: device.trusted ? "Trusted" : "Untrusted" },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={device.connected ? "Disconnect" : "Connect"}
                icon={device.connected ? Icon.XMarkCircle : Icon.Check}
                onAction={() => toggleConnection(device)}
              />
              {!device.paired && (
                <Action
                  title="Pair"
                  icon={Icon.Link}
                  onAction={() => pairDevice(device)}
                />
              )}
              <Action
                title={device.trusted ? "Untrust" : "Trust"}
                icon={device.trusted ? Icon.Shield : Icon.Check}
                onAction={() => toggleTrust(device)}
              />
              <Action
                title="Remove Device"
                icon={Icon.Trash}
                onAction={() => removeDevice(device)}
                style={Action.Style.Destructive}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={loadDevices}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
