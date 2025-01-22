import { makeEventListener } from "@solid-primitives/event-listener";
import { makeTimer } from "@solid-primitives/timer";
import { Title } from "@solidjs/meta";
import { createRenderEffect, createSignal } from "solid-js";
import { isServer } from "solid-js/web";

export const withWindowOpen = (fn: (open: (href: string) => void) => Promise<void>) => () => {
  const windowRef = window.open("/loading")
  fn(href => {
    if (windowRef === null) {
      location.href = href
      return
    }
    windowRef.postMessage(href)
  })
}

export default function Loading() {

  const [complete, setComplete] = createSignal(false)

  if (!isServer) makeEventListener(
    window,
    "message",
    (e) => {
      if (e.origin !== window.origin) return

      location.href = e.data
      makeTimer(() => {
        setComplete(true)
      }, 5_000, setTimeout)
    }
  )

  createRenderEffect(() => {
    if (complete()) window.close()
  })

  return <>
      <Title>loading...</Title>
      <article>
        <h1>loading your post body for bluesky</h1>
        <p>you should be redirected shortly...</p>
        <progress />
      </article>
  </>;
}
