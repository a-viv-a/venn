import { Title } from "@solidjs/meta";

export default function Loading() {
  return (
    <>
      <Title>loading...</Title>
      <article>
        <h1>loading your post body for bluesky</h1>
        <p>you should be redirected shortly...</p>
        <progress />
      </article>
    </>
  );
}
