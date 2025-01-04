import { A } from "@solidjs/router";
import { Component } from "solid-js";

const CurrentUrl: Component = props => <A href={window.location.href} >{
  window.location.href
}</A>
export default CurrentUrl
