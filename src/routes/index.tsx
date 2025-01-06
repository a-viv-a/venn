import { Title } from "@solidjs/meta";
import { HandleInput } from "~/components/HandleInput";

export default function Home() {
  return (
    <main>
      <Title>venn</Title>
      <h1>venn diagram</h1>
      <p>
        Go forth! Generate your very own venn diagram!
      </p>
      <HandleInput />
    </main>
  );
}
