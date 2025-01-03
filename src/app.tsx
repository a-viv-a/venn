import { MetaProvider, Title } from "@solidjs/meta";
import { A, Router, useNavigate } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Component, ErrorBoundary, ParentComponent, Show, Suspense } from "solid-js";
import "./pico.violet.min.css"
import { narrow } from "./utils";
import { IS_PRODUCTION } from "./mode";


const ShowError: Component<{ err: () => any, reset?: () => void }> = props => {
  const navigate = useNavigate()
  return <article>
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
    <div role="group">
      <Show when={props.reset}>{reset =>
        <input type="reset" onClick={reset()} value="try to continue" />
      }</Show>
      <button onClick={() => navigate("/")}>go home</button>
    </div>
  </article>
}

const ProdErrorBoundary: ParentComponent<{ show?: boolean }> = props => <Show when={props.show || IS_PRODUCTION} fallback={props.children}>
  <ErrorBoundary fallback={(err, reset) => <ShowError err={() => err} reset={reset} />}>
    {props.children}
  </ErrorBoundary>
</Show>

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>SolidStart - Basic</Title>
          <ProdErrorBoundary>
            <Suspense>{props.children}</Suspense>
          </ProdErrorBoundary>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
