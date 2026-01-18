import { spawn } from "child_process";
import { useEffect, useRef } from "react";

interface PiRpcClient {
  send: (command: any) => Promise<any>;
  onEvent: (callback: (event: any) => void) => void;
  close: () => void;
}

export function usePiRpc(): PiRpcClient {
  const procRef = useRef<any>(null);
  const eventCallbackRef = useRef<((event: any) => void) | null>(null);
  const pendingRequests = useRef<Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>>(new Map());

  useEffect(() => {
    // Spawn pi in RPC mode
    const proc = spawn("pi", ["--mode", "rpc", "--no-session"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    procRef.current = proc;

    let buffer = "";
    proc.stdout.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            if (message.type === "response" && message.id) {
              const pending = pendingRequests.current.get(message.id);
              if (pending) {
                pendingRequests.current.delete(message.id);
                if (message.success) {
                  pending.resolve(message);
                } else {
                  pending.reject(new Error(message.error || "RPC error"));
                }
              }
            } else if (message.type && message.type !== "response") {
              // Event
              if (eventCallbackRef.current) {
                eventCallbackRef.current(message);
              }
            }
          } catch (e) {
            console.error("Failed to parse RPC message:", line, e);
          }
        }
      }
    });

    proc.stderr.on("data", (data) => {
      console.error("Pi stderr:", data.toString());
    });

    proc.on("close", (code) => {
      console.log("Pi process exited with code", code);
    });

    return () => {
      proc.kill();
    };
  }, []);

  const send = (command: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!procRef.current) {
        reject(new Error("Pi process not started"));
        return;
      }

      const id = Date.now() + Math.random();
      const cmd = { ...command, id };
      pendingRequests.current.set(id, { resolve, reject });

      procRef.current.stdin.write(JSON.stringify(cmd) + "\n", (err: any) => {
        if (err) {
          pendingRequests.current.delete(id);
          reject(err);
        }
      });
    });
  };

  const onEvent = (callback: (event: any) => void) => {
    eventCallbackRef.current = callback;
  };

  const close = () => {
    if (procRef.current) {
      procRef.current.kill();
    }
  };

  return { send, onEvent, close };
}