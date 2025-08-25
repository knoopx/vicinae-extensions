"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/list-wireless-networks.tsx
var list_wireless_networks_exports = {};
__export(list_wireless_networks_exports, {
  default: () => Command
});
module.exports = __toCommonJS(list_wireless_networks_exports);
var import_api = require("@vicinae/api");
var import_react = require("react");
var import_child_process = require("child_process");
var import_jsx_runtime = require("react/jsx-runtime");
function parseNmcliOutput(output) {
  const lines = output.trim().split("\n");
  const networks = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = line.split(":");
    if (fields.length >= 6) {
      networks.push({
        active: fields[0].toLowerCase() === "yes",
        ssid: fields[1],
        bssid: fields[2],
        channel: fields[3],
        signal: fields[4],
        security: fields[5]
      });
    }
  }
  return networks;
}
function useWiFiNetworks() {
  const [networks, setNetworks] = (0, import_react.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    setIsLoading(true);
    (0, import_child_process.exec)(
      "nmcli -t -f ACTIVE,SSID,BSSID,CHAN,SIGNAL,SECURITY device wifi list",
      (err, stdout, stderr) => {
        if (err) {
          setError(stderr || err.message);
          setNetworks([]);
          setIsLoading(false);
          return;
        }
        setNetworks(parseNmcliOutput(stdout));
        setIsLoading(false);
      }
    );
  }, []);
  return { networks, isLoading, error };
}
function connectToNetwork(ssid, password) {
  return new Promise((resolve) => {
    let cmd = `nmcli device wifi connect "${ssid}"`;
    if (password) cmd += ` password "${password}"`;
    (0, import_child_process.exec)(cmd, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: stderr || err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}
function disconnectFromNetwork() {
  return new Promise((resolve) => {
    (0, import_child_process.exec)("nmcli device disconnect", (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: stderr || err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}
function forgetNetwork(ssid) {
  return new Promise((resolve) => {
    (0, import_child_process.exec)(
      `nmcli -t -f UUID,NAME connection show | grep ":${ssid}" | cut -d":" -f1`,
      (err, stdout, stderr) => {
        if (err || !stdout.trim()) {
          resolve({ success: false, error: "Could not find saved network." });
          return;
        }
        const uuid = stdout.trim();
        (0, import_child_process.exec)(`nmcli connection delete ${uuid}`, (err2, stdout2, stderr2) => {
          if (err2) {
            resolve({ success: false, error: stderr2 || err2.message });
          } else {
            resolve({ success: true });
          }
        });
      }
    );
  });
}
function PasswordForm({ ssid, onSubmit }) {
  const { pop } = (0, import_api.useNavigation)();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_api.Form,
    {
      navigationTitle: `Connect to ${ssid}`,
      actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.ActionPanel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_api.Action.SubmitForm,
        {
          title: "Connect",
          onSubmit: (values) => {
            onSubmit(values.password);
            pop();
          }
        }
      ) }),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Form.PasswordField, { id: "password", title: "Password" })
    }
  );
}
function Command() {
  const { networks, isLoading, error } = useWiFiNetworks();
  const [search, setSearch] = (0, import_react.useState)("");
  const { push } = (0, import_api.useNavigation)();
  const filtered = search ? networks.filter(
    (n) => n.ssid.toLowerCase().includes(search.toLowerCase()) || n.bssid.toLowerCase().includes(search.toLowerCase()) || n.security.toLowerCase().includes(search.toLowerCase())
  ) : networks;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_api.List,
    {
      navigationTitle: `Found ${filtered.length} networks`,
      isLoading,
      searchBarPlaceholder: "Search by SSID, BSSID, or security",
      onSearchTextChange: setSearch,
      children: error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.List.EmptyView, { title: "Error", description: error }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.List.EmptyView, { title: "No Wireless Networks Found", description: "Make sure wireless is enabled and try refreshing." }) : filtered.map((network) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_api.List.Item,
        {
          title: network.ssid || "Hidden Network",
          subtitle: network.bssid,
          accessories: [
            { text: `${network.signal}%`, tooltip: "Signal strength" },
            { text: network.security && network.security !== "--" ? network.security : "Open", tooltip: "Security" },
            { text: network.channel ? `Ch ${network.channel}` : "", tooltip: "Channel" },
            { tag: network.active ? "Connected" : "Available" }
          ],
          actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_api.ActionPanel, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action.CopyToClipboard, { title: "Copy SSID", content: network.ssid }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_api.Action.CopyToClipboard, { title: "Copy BSSID", content: network.bssid }),
            !network.active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_api.Action,
              {
                title: "Connect",
                onAction: () => {
                  if (network.security && network.security !== "--") {
                    push(
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        PasswordForm,
                        {
                          ssid: network.ssid,
                          onSubmit: async (password) => {
                            (0, import_api.showToast)({ style: import_api.Toast.Style.Animated, title: "Connecting..." });
                            const result = await connectToNetwork(network.ssid, password);
                            if (result.success) {
                              (0, import_api.showToast)({ style: import_api.Toast.Style.Success, title: `Connected to ${network.ssid}` });
                            } else {
                              (0, import_api.showToast)({ style: import_api.Toast.Style.Failure, title: `Failed to connect: ${result.error}` });
                            }
                          }
                        }
                      )
                    );
                  } else {
                    (0, import_api.showToast)({ style: import_api.Toast.Style.Animated, title: "Connecting..." });
                    connectToNetwork(network.ssid).then((result) => {
                      if (result.success) {
                        (0, import_api.showToast)({ style: import_api.Toast.Style.Success, title: `Connected to ${network.ssid}` });
                      } else {
                        (0, import_api.showToast)({ style: import_api.Toast.Style.Failure, title: `Failed to connect: ${result.error}` });
                      }
                    });
                  }
                }
              }
            ),
            network.active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_api.Action,
              {
                title: "Disconnect",
                onAction: async () => {
                  (0, import_api.showToast)({ style: import_api.Toast.Style.Animated, title: "Disconnecting..." });
                  const result = await disconnectFromNetwork();
                  if (result.success) {
                    (0, import_api.showToast)({ style: import_api.Toast.Style.Success, title: `Disconnected from ${network.ssid}` });
                  } else {
                    (0, import_api.showToast)({ style: import_api.Toast.Style.Failure, title: `Failed to disconnect: ${result.error}` });
                  }
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_api.Action,
              {
                title: "Forget Network",
                onAction: async () => {
                  (0, import_api.showToast)({ style: import_api.Toast.Style.Animated, title: "Forgetting network..." });
                  const result = await forgetNetwork(network.ssid);
                  if (result.success) {
                    (0, import_api.showToast)({ style: import_api.Toast.Style.Success, title: `Forgot network ${network.ssid}` });
                  } else {
                    (0, import_api.showToast)({ style: import_api.Toast.Style.Failure, title: `Failed to forget: ${result.error}` });
                  }
                }
              }
            )
          ] })
        },
        network.bssid
      ))
    }
  );
}
