import { Component, ParentComponent, Suspense } from "solid-js"

export const ShowRatio: Component<{
  follows?: number,
  followers?: number,
  busy?: boolean
}> = props => <p aria-busy={props.busy} style="white-space: initial">
  <sup>{props.followers} followers</sup>&frasl;<sub>{props.follows} following</sub> = {
    ((props.followers ?? 0) / (props.follows ?? 1)).toFixed(3)
  } ratio
</p>

const finiteElse = (num: number | undefined, fallback: number) => Number.isFinite(num) ? num : fallback

export const CompletableProgress: Component<{
  value: number | undefined,
  max: number | undefined,
  isDone: boolean
}> = props =>
    <progress value={finiteElse(props.isDone ? props.max : props.value, 0)} max={props.max} />

export const SuspenseProgress: ParentComponent = props => <Suspense fallback={<progress />}>{props.children}</Suspense>
