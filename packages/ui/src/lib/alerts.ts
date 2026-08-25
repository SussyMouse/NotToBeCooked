import Swal from "sweetalert2"

/**
 * Dev-only toast for developers to quickly inspect data or API responses visually.
 * Automatically disabled in production builds.
 */
export const devToast = (data: unknown) => {
  const env = (
    import.meta as ImportMeta & {
      env?: { DEV?: boolean }
    }
  ).env

  // Fail closed: if the bundler did not inject import.meta.env.DEV, assume this
  // is not a dev build. The old `?? true` default meant any context Vite does
  // not substitute (some Tauri packaging paths) shipped the toast to users.
  const isDev = Boolean(env?.DEV ?? false)

  if (isDev) {
    const textContent =
      typeof data === "string" ? data : JSON.stringify(data, null, 2)

    // Escaped: `data` routinely carries server-supplied strings (error messages),
    // and Swal's `html` option would otherwise render them as markup.
    const escaped = textContent.replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch]!
    )

    Swal.fire({
      title: "🛠️ Dev Response",
      html: `<pre style="text-align: left; max-height: 250px; overflow-y: auto; font-size: 12px; font-family: monospace;">${escaped}</pre>`,
      icon: "info",
      toast: true,
      position: "bottom-end",
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
    })
  }
}

export default devToast
