import Swal from "sweetalert2";

/**
 * Dev-only toast for developers to quickly inspect data or API responses visually.
 * Automatically disabled in production builds.
 */
export const devToast = (data: unknown) => {
  const env = (
    import.meta as ImportMeta & {
      env?: { DEV?: boolean };
    }
  ).env;

  const isDev = Boolean(env?.DEV ?? true);

  if (isDev) {
    const textContent =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);

    Swal.fire({
      title: "🛠️ Dev Response",
      html: `<pre style="text-align: left; max-height: 250px; overflow-y: auto; font-size: 12px; font-family: monospace;">${textContent}</pre>`,
      icon: "info",
      toast: true,
      position: "bottom-end",
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
    });
  }
};

export default devToast;