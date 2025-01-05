import { action, redirect } from "@solidjs/router";
import { Component, createEffect, createSignal, Show, Suspense } from "solid-js";

const goGenerate = action(async (handle: string) => {
  throw redirect(`/${handle}`)
}, "goGenerate")

export const HandleInput: Component = props => {
  const [handle, setHandle] = createSignal("")
  const validURL = () => URL.canParse(`https://${handle()}`)

  let ref: HTMLInputElement | undefined

  createEffect(() => {
    if (!validURL()) {
      ref?.setCustomValidity("invalid handle")
      return
    }
    if (!handle().includes(".")) {
      ref?.setCustomValidity("you probably want to include a tld")
      return
    }
    ref?.setCustomValidity("")
  })

  return <form action={goGenerate.with(handle())} method="post">
    <fieldset role="group">
      <input name="handle" placeholder="handle.example.com" required minlength={3}
        onInput={e => setHandle(e.target.value)}
        ref={ref}
      />
      <input type="submit" value="go" />
    </fieldset>
  </form>
}
