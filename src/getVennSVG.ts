import styles from "~/components/Venn.module.css"

export const getVennSVG = () => {
  const documentVenn = document.querySelector<SVGAElement>(`.${styles.venndiagram} > svg`)
  if (documentVenn === null) return undefined
  const venn = documentVenn.cloneNode(true) as SVGAElement

  // make the svg legal for standalone rendering
  venn.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  // these are only for interactivity, we can drop them
  venn.querySelectorAll("g.venn-intersection").forEach(g => venn.removeChild(g))
  // in the document this is inhereted but we need to set it for the rendering
  venn.querySelectorAll("tspan").forEach(tspan => {
    tspan.style.fontSize = "18px"
  })

  return venn.outerHTML
}
