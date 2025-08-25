import { showToast, Toast } from "@vicinae/api";
import { scanMusicDirectory } from "./scanner";
import { saveReleasesToCache } from "./cache";

export default async function ScanLibrary() {
  try {
    showToast({
      style: Toast.Style.Animated,
      title: "Scanning music library...",
    });

    const releases = await scanMusicDirectory();
    saveReleasesToCache(releases);

    showToast({
      style: Toast.Style.Success,
      title: `Scan complete: ${releases.length} releases found`,
    });
  } catch (error) {
    console.error("Error scanning library:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to scan music library",
      message: String(error),
    });
  }
}
