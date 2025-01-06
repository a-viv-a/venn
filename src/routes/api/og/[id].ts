import { initWasm, Resvg } from "@resvg/resvg-wasm";
// @ts-expect-error wasm is unhappy
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm"
import type { APIEvent } from "@solidjs/start/server";
import { IS_DEVELOPMENT } from "~/mode";
import { useEvent } from "~/server/serverUtils";

/*
is this safe? I *think* so;

- we limit the length of the svg pretty hard, should reduce denial of wallet risk?
- independent worker from the one serving the ssr page, *should* eliminate xss risk
- we run within cf workers, which is "perfect" containerization, for free
- no data of any value is stored in the worker, so escaping from resvg would only allow
poisioning future responses for images. maybe.

unknowns:
- is resvg ok for this usecase? does it intend to parse untrusted input?
- can resvg go into infinite loops or be tricked into making network requests?
*/


// worker might be reused for multiple invocations
let init = false

export async function GET(event: APIEvent) {
  const id = event.params.id
  const { env } = await useEvent(event)

  const svgString = await env.svgs.get(id)
  if (svgString === null) return new Response(null, { status: 404 })
  if (IS_DEVELOPMENT) console.log({ svgString })
  if (svgString.length > 2_500) {
    console.warn(`string too long: ${svgString.length}`)
    return new Response(null, { status: 400 })
  }

  try {
    if (!init) {
      await initWasm(IS_DEVELOPMENT
        ? fetch('https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm')
        : resvgWasm)
      init = true
    }

    // TODO: fix this it smells bad and probably slows down rendering
    const robotoMediumBuffer = new Uint8Array(await (await fetch("https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxK.woff2")).arrayBuffer())

    const resvg = new Resvg(svgString, {
      font: {
        fontBuffers: [
          robotoMediumBuffer
        ]
      }
    })

    const img = resvg.render()
    return new Response(img.asPng(), {
      headers: {
        "Content-Type": "image/png"
      }
    })
  } catch (e) {
    console.error(e)
    return new Response(null, { status: 400 })
  }
}
