import { List, ActionPanel, Action, showToast, Toast, Form, useNavigation } from "@vicinae/api"
import { useState, useEffect } from "react"
import { exec } from "child_process"

interface WiFiNetwork {
  active: boolean
  ssid: string
  bssid: string
  channel: string
  signal: string
  security: string
}

function parseNmcliOutput(output: string): WiFiNetwork[] {
  const lines = output.trim().split("\n")
  const networks: WiFiNetwork[] = []
  for (const line of lines) {
    if (!line.trim()) continue
    const fields = line.split(":")
    if (fields.length >= 6) {
      networks.push({
        active: fields[0].toLowerCase() === "yes",
        ssid: fields[1],
        bssid: fields[2],
        channel: fields[3],
        signal: fields[4],
        security: fields[5],
      })
    }
  }
  return networks
}

function useWiFiNetworks() {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setIsLoading(true)
    exec(
      "nmcli -t -f ACTIVE,SSID,BSSID,CHAN,SIGNAL,SECURITY device wifi list",
      (err, stdout, stderr) => {
        if (err) {
          setError(stderr || err.message)
          setNetworks([])
          setIsLoading(false)
          return
        }
        setNetworks(parseNmcliOutput(stdout))
        setIsLoading(false)
      }
    )
  }, [])
  return { networks, isLoading, error }
}

function connectToNetwork(ssid: string, password?: string) {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    let cmd = `nmcli device wifi connect "${ssid}"`
    if (password) cmd += ` password "${password}"`
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: stderr || err.message })
      } else {
        resolve({ success: true })
      }
    })
  })
}

function disconnectFromNetwork() {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    exec("nmcli device disconnect", (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: stderr || err.message })
      } else {
        resolve({ success: true })
      }
    })
  })
}

function forgetNetwork(ssid: string) {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    exec(
      `nmcli -t -f UUID,NAME connection show | grep ":${ssid}" | cut -d":" -f1`,
      (err, stdout, stderr) => {
        if (err || !stdout.trim()) {
          resolve({ success: false, error: "Could not find saved network." })
          return
        }
        const uuid = stdout.trim()
        exec(`nmcli connection delete ${uuid}`, (err2, stdout2, stderr2) => {
          if (err2) {
            resolve({ success: false, error: stderr2 || err2.message })
          } else {
            resolve({ success: true })
          }
        })
      }
    )
  })
}

function PasswordForm({ ssid, onSubmit }: { ssid: string; onSubmit: (password: string) => void }) {
  const { pop } = useNavigation()
  return (
    <Form
      navigationTitle={`Connect to ${ssid}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Connect"
            onSubmit={(values) => {
              onSubmit(values.password)
              pop()
            }}
          />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="password" title="Password" />
    </Form>
  )
}

export default function Command() {
  const { networks, isLoading, error } = useWiFiNetworks()
  const [search, setSearch] = useState("")
  const { push } = useNavigation()
  const filtered = search
    ? networks.filter(
        (n) =>
          n.ssid.toLowerCase().includes(search.toLowerCase()) ||
          n.bssid.toLowerCase().includes(search.toLowerCase()) ||
          n.security.toLowerCase().includes(search.toLowerCase())
      )
    : networks
  return (
    <List
      navigationTitle={`Found ${filtered.length} networks`}
      isLoading={isLoading}
      searchBarPlaceholder="Search by SSID, BSSID, or security"
      onSearchTextChange={setSearch}
    >
      {error ? (
        <List.EmptyView title="Error" description={error} />
      ) : filtered.length === 0 ? (
        <List.EmptyView title="No Wireless Networks Found" description="Make sure wireless is enabled and try refreshing." />
      ) : (
        filtered.map((network) => (
          <List.Item
            key={network.bssid}
            title={network.ssid || "Hidden Network"}
            subtitle={network.bssid}
            accessories={[
              { text: `${network.signal}%`, tooltip: "Signal strength" },
              { text: network.security && network.security !== "--" ? network.security : "Open", tooltip: "Security" },
              { text: network.channel ? `Ch ${network.channel}` : "", tooltip: "Channel" },
              { tag: network.active ? "Connected" : "Available" },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy SSID" content={network.ssid} />
                <Action.CopyToClipboard title="Copy BSSID" content={network.bssid} />
                {!network.active && (
                  <Action
                    title="Connect"
                    onAction={() => {
                      if (network.security && network.security !== "--") {
                        push(
                          <PasswordForm
                            ssid={network.ssid}
                            onSubmit={async (password) => {
                              showToast({ style: Toast.Style.Animated, title: "Connecting..." })
                              const result = await connectToNetwork(network.ssid, password)
                              if (result.success) {
                                showToast({ style: Toast.Style.Success, title: `Connected to ${network.ssid}` })
                              } else {
                                showToast({ style: Toast.Style.Failure, title: `Failed to connect: ${result.error}` })
                              }
                            }}
                          />
                        )
                      } else {
                        showToast({ style: Toast.Style.Animated, title: "Connecting..." })
                        connectToNetwork(network.ssid).then((result) => {
                          if (result.success) {
                            showToast({ style: Toast.Style.Success, title: `Connected to ${network.ssid}` })
                          } else {
                            showToast({ style: Toast.Style.Failure, title: `Failed to connect: ${result.error}` })
                          }
                        })
                      }
                    }}
                  />
                )}
                {network.active && (
                  <Action
                    title="Disconnect"
                    onAction={async () => {
                      showToast({ style: Toast.Style.Animated, title: "Disconnecting..." })
                      const result = await disconnectFromNetwork()
                      if (result.success) {
                        showToast({ style: Toast.Style.Success, title: `Disconnected from ${network.ssid}` })
                      } else {
                        showToast({ style: Toast.Style.Failure, title: `Failed to disconnect: ${result.error}` })
                      }
                    }}
                  />
                )}
                <Action
                  title="Forget Network"
                  onAction={async () => {
                    showToast({ style: Toast.Style.Animated, title: "Forgetting network..." })
                    const result = await forgetNetwork(network.ssid)
                    if (result.success) {
                      showToast({ style: Toast.Style.Success, title: `Forgot network ${network.ssid}` })
                    } else {
                      showToast({ style: Toast.Style.Failure, title: `Failed to forget: ${result.error}` })
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  )
}
