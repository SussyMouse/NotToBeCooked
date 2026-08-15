// import { useEffect, useState } from "react"
import { SharedMainApp } from "@workspace/ui/app"

export function App() {
  // const [backendStatus, setBackendStatus] = useState("Connecting...")

  // useEffect(() => {
  //   fetch("http://127.0.0.1:8000/health")
  //     .then((response) => response.json())
  //     .then((data) => {
  //       if (data.status === "ok") {
  //         setBackendStatus("Backend Connected ✅")
  //       } else {
  //         setBackendStatus("Backend Error ❌")
  //       }
  //     })
  //     .catch(() => {
  //       setBackendStatus("Backend Disconnected ❌")
  //     })
  // }, [])

  return (
    <>
      <SharedMainApp platform="web" />

      {/* <div className="fixed bottom-5 right-5 rounded-lg border bg-background p-3">
        {backendStatus}
      </div> */}
    </>
  )
}