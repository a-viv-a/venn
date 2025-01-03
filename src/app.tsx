import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Component, ErrorBoundary, Show, Suspense } from "solid-js";
import "./pico.violet.min.css"
import { narrow } from "./utils";


const ShowError: Component<{ err: () => any, reset?: () => void }> = props => <article>
  <Show fallback={<h2>error</h2>} when={narrow(props.err, e => e instanceof Error)}>{err => <>
    <Show when={err().name.toLowerCase() !== "error"} fallback={<h2>error</h2>}><h2>{err().name} error</h2></Show>
    <pre><code>{err().message}</code></pre>
    <Show when={err().cause}>{cause =>
      <pre><code>cause: {cause().toString()}</code></pre>
    }</Show>
    <Show when={err().stack}>{stack =>
      <details>
        <summary role="button">error stack</summary>
        <pre><code>{stack().toString()}</code></pre>
      </details>
    }</Show>
  </>}</Show>
  <Show when={props.reset}>{reset =>
    <input type="reset" onClick={reset()} value="try to continue" />
  }</Show>
</article>

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>SolidStart - Basic</Title>
          <ErrorBoundary fallback={(err, reset) => <ShowError err={() => err} reset={reset} />}>
            <Suspense>{props.children}</Suspense>
          </ErrorBoundary>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
