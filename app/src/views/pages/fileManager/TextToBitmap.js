export const textToBitmap = (text) => {
  const FONT_SIZE = 42
  const font = 'Tahoma'
  const canvas = window.document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  // scale up the font size by the DPR factor. When
  // rendering, we'll scale down the image by the same
  // amount.
  ctx.font = `${FONT_SIZE * dpr}px '${font}'`

  // IE and Edge only returns width as part of measureText
  const { actualBoundingBoxLeft, actualBoundingBoxRight, actualBoundingBoxAscent, actualBoundingBoxDescent, width } = ctx.measureText(text)
  canvas.height = actualBoundingBoxAscent + actualBoundingBoxDescent

  canvas.width = Math.max(width, Math.abs(actualBoundingBoxLeft) + actualBoundingBoxRight)

  ctx.font = `${FONT_SIZE * dpr}px ${font}`
  ctx.textBaseline = 'top'
  ctx.fillText(text, 0, 0)
  return canvas.toDataURL()
}
