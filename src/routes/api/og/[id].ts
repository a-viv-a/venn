import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasmInit from "@resvg/resvg-wasm/index_bg.wasm?init"
import type { APIEvent } from "@solidjs/start/server";
import { IS_DEVELOPMENT } from "~/mode";
import { useEvent } from "~/server/serverUtils";

// worker might be reused for multiple invocations
let init = false

// TODO: fix this it smells bad
const robotoMediumBuffer = new Uint8Array(await (await fetch("https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxK.woff2")).arrayBuffer())

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
        : resvgWasmInit())
      init = true
    }
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
