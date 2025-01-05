import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
  return (
    <>
      <Title>Not Found</Title>
      <HttpStatusCode code={404} />
      <article>
        <h1>you win a 404!</h1>
        <p>there is no page here. if you were expecting to load a venn diagram, make sure you put something reasonable in the url.
          otherwise, this page doesn't exist. maybe it never did.</p>
        <A href="/">go home</A>
      </article>
    </>
  );
}
