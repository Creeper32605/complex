const canvas = document.querySelector('#complex-canvas')
let dp = window.devicePixelRatio || 1
// dummy values
let width = 1
let height = 1
// pixels per grid unit
let rscale = 50
let scale = rscale * dp

let draw

let updateSize = function () {
  dp = window.devicePixelRatio || 1
  const size = canvas.getBoundingClientRect()
  canvas.width = (width = size.width) * dp
  canvas.height = (height = size.height) * dp
  scale = rscale * dp
  draw()
}
window.addEventListener('resize', updateSize)

const ctx = canvas.getContext('2d')

class Color {
  constructor (r, g, b, a) {
    this.r = Math.round(Math.min(255, Math.max(0, r)))
    this.g = Math.round(Math.min(255, Math.max(0, g)))
    this.b = Math.round(Math.min(255, Math.max(0, b)))
    this.a = Math.min(255, Math.max(0, a))
  }
  clone (r, g, b, a) {
    return new Color(
      r !== undefined ? r : this.r,
      g !== undefined ? g : this.g,
      b !== undefined ? b : this.b,
      a !== undefined ? a : this.a
    )
  }
  fade (a = 1) {
    return this.clone(undefined, undefined, undefined, this.a * a)
  }
  get rgba () {
    return `rgba(${this.r},${this.g},${this.b},${this.a})`
  }
}

let colors = {
  background: new Color(0x09, 0x12, 0x30, 1),
  grid: new Color(0xff, 0xff, 0xff, 0.5),
  brightGrid: new Color(0xff, 0xff, 0xff, 1),
  point: new Color(0x89, 0xb7, 0xff, 1),
  tempPoint: new Color(0xff, 0xb7, 0x89, 1),
  arrow: new Color(0xff, 0x88, 0xff, 1)
}

let drawGrid = function (x, y, rotation, size, opacity, points) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  ctx.font = `${scale / 2}px monospace`
  ctx.textBaseline = 'bottom'

  let originX = width / 2 * dp + x * scale
  let originY = height / 2 * dp + y * scale

  // size of the part of the grid that'll be drawn
  let left = Math.floor(-originX / scale / size)
  let top = Math.floor(-originY / scale / size)
  let right = Math.ceil((2 * width - originX) / scale / size)
  let bottom = Math.ceil((2 * height - originY) / scale / size)

  // line length
  let length = Math.hypot(originX, originY) / size

  let grid = colors.grid.rgba
  let brightGrid = colors.brightGrid.rgba

  ctx.globalAlpha = opacity

  ctx.translate(originX, originY)
  ctx.scale(size, size)
  ctx.rotate(rotation)

  // make sure lines are always the same width
  ctx.lineWidth = 1 / size

  // grid line interval
  let inc = 1

  if (size < 0.1) {
    inc = Math.ceil(0.1 / size)
    // make sure 0 isn't skipped
    left = Math.ceil(left / inc) * inc
    top = Math.ceil(top / inc) * inc
  }
  // draw grid lines
  ctx.beginPath()
  ctx.strokeStyle = grid
  for (let ly = top; ly < bottom; ly += inc) {
    if (ly === 0) continue
    ctx.moveTo(-length, ly * scale)
    ctx.lineTo(length, ly * scale)
  }
  for (let lx = left; lx < right; lx += inc) {
    if (lx === 0) continue
    ctx.moveTo(lx * scale, -length)
    ctx.lineTo(lx * scale, length)
  }
  ctx.stroke()

  // draw bright origin lines
  ctx.lineWidth *= 2
  ctx.beginPath()
  ctx.strokeStyle = brightGrid
  ctx.moveTo(-length, 0)
  ctx.lineTo(length, 0)
  ctx.moveTo(0, -length)
  ctx.lineTo(0, length)
  ctx.stroke()

  ctx.globalAlpha = 1
  ctx.lineWidth = 2

  // points
  let pointScale = 0.4
  for (let point of points.values()) {
    if (!point.visible) continue
    ctx.strokeStyle = (point.temp ? colors.tempPoint : colors.point).rgba
    let px = point.x * scale
    let py = -point.y * scale
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(-rotation)
    ctx.scale(1 / size, 1 / size)
    ctx.beginPath()
    ctx.moveTo(-scale * pointScale, -scale * pointScale)
    ctx.lineTo(scale * pointScale, scale * pointScale)
    ctx.moveTo(-scale * pointScale, scale * pointScale)
    ctx.lineTo(scale * pointScale, -scale * pointScale)
    ctx.stroke()
    if (point.named) {
      ctx.fillStyle = '#fff'
      ctx.fillText(point.value.toString(), 0, 0)
    }
    ctx.restore()
  }
}

let grids = new Set()
draw = function () {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = colors.background.rgba
  ctx.fillRect(0, 0, width * dp, height * dp)

  for (let grid of grids.values()) {
    grid.draw()
  }
}
updateSize()

class GridPoint {
  constructor (r, i) {
    this.value = new ComplexNumber(r, i)
    this.visible = true
    this.temp = false
    this.named = false
  }
  get x () { return this.value.real }
  get y () { return this.value.imag }
  set x (v) { this.value.real = v }
  set y (v) { this.value.imag = v }

  static temp () {
    let p = new GridPoint()
    p.temp = true
    return p
  }
}

class Arrow {
  constructor (start, end) {
    this.start = start
    this.end = end
    this.progress = 0
  }

  render () {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.translate(width / 2 * dp, height / 2 * dp)
    ctx.scale(scale, scale)
    ctx.translate(this.end.real, -this.end.imag)
    let len = Math.hypot(this.end.imag - this.start.imag, this.end.real - this.start.real)
    let angle = Math.atan2(this.end.imag - this.start.imag, this.end.real - this.start.real)
    ctx.rotate(-angle)
    ctx.lineWidth = 3 / scale
    ctx.strokeStyle = ctx.fillStyle = colors.arrow.rgba
    ctx.beginPath()
    ctx.moveTo(-len * (1 - this.progress), 0)
    ctx.lineTo(0, 0)
    ctx.stroke()
    if (this.progress > 0.8) {
      ctx.globalAlpha = 1 - (1 - this.progress) / 0.2
      ctx.beginPath()
      ctx.moveTo(-len, 0)
      ctx.lineTo(0, 0)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-0.4, -0.2)
    ctx.lineTo(-0.3, 0)
    ctx.lineTo(-0.4, 0.2)
    ctx.closePath()
    ctx.fill()
  }
}

let easeInOutCubic = function (t) {
  return t < 0.5 ? (4 * t * t * t) : ((t - 1) * (2 * t - 2) * (2 * t - 2) + 1)
}

class AnimatedValue {
  constructor (value) {
    this.target = value
    this.previous = value
    this.value = value
    this.startTime = 0
    this.endTime = 0

    this.isLooping = false
    this.boundLoop = () => this.loop()
    this.onupdate = () => {}
    this.onend = () => {}
  }
  animate (value, time) {
    this.previous = this.value
    this.target = value
    this.startTime = Date.now()
    this.endTime = Date.now() + time * 1000
    if (!this.isLooping) {
      this.isLooping = true
      this.loop()
    }
  }
  loop () {
    let now = Date.now()
    let easing = (now - this.startTime) / (this.endTime - this.startTime)
    easing = easeInOutCubic(easing)
    if (now >= this.endTime) {
      this.isLooping = false
      this.value = this.target
      this.onupdate(this)
      this.onend(this)
    } else {
      if (this.isLooping) window.requestAnimationFrame(this.boundLoop)
      if (Array.isArray(this.value)) {
        for (let i = 0; i < this.value.length; i++) {
          this.value[i] = this.previous[i] + easing * (this.target[i] - this.previous[i])
        }
      } else {
        this.value = this.previous + easing * (this.target - this.previous)
      }
      this.onupdate(this)
    }
  }
}

class Grid {
  constructor () {
    this.x = 0
    this.y = 0
    this.scale = 1
    this.rotate = 0
    this.opacity = 1
    this.points = new Set()
    grids.add(this)
  }
  destroy () {
    grids.delete(this)
    draw()
  }
  draw () {
    drawGrid(this.x, -this.y, -this.rotate, this.scale, this.opacity, this.points)
  }
}

const rootGrid = new Grid()
const currentPoint = new GridPoint()
currentPoint.named = true
const opPoint = new GridPoint()
opPoint.visible = false
opPoint.named = true
opPoint.temp = true
rootGrid.points.add(currentPoint)
rootGrid.points.add(opPoint)

const integerTolerance = 0.2

const projectPoint = function (x, y) {
  let point = [x - canvas.offsetWidth / 2, -y + canvas.offsetHeight / 2]
  point = point.map(x => x / rscale)
  let integer = point.map(x => Math.round(x))
  if (Math.abs(point[0] - integer[0]) < integerTolerance && Math.abs(point[1] - integer[1]) < integerTolerance) {
    point = integer
  }
  return point
}

let isDown = false
canvas.addEventListener('mousedown', e => {
  let point = projectPoint(e.offsetX, e.offsetY)
  opPoint.x = point[0]
  opPoint.y = point[1]
  opPoint.visible = true
  isDown = true
  draw()
})

window.addEventListener('mousemove', e => {
  if (!isDown) return
  let point = projectPoint(e.offsetX, e.offsetY)
  opPoint.x = point[0]
  opPoint.y = point[1]
  draw()
})

window.addEventListener('mouseup', e => {
  if (!isDown) return
  isDown = false
})

document.querySelector('#add-btn').addEventListener('click', () => {
  if (!opPoint.visible) return
  rootGrid.points.delete(currentPoint)
  rootGrid.opacity = 0
  let opGrid = new Grid()
  opGrid.points.add(currentPoint)
  opGrid.points.add(GridPoint.temp())
  let opArrow = new Arrow(new ComplexNumber(0, 0), opPoint.value)
  let anim = new AnimatedValue([0, 0, 0])
  anim.onupdate = () => {
    opGrid.x = anim.value[0]
    opGrid.y = anim.value[1]
    draw()
    opArrow.progress = anim.value[2]
    opArrow.render()
  }
  anim.onend = () => {
    currentPoint.value = currentPoint.value.add(opPoint.value)
    opPoint.visible = false
    rootGrid.opacity = 1
    rootGrid.points.add(currentPoint)
    rootGrid.points.delete(opPoint)
    rootGrid.points.add(opPoint)
    opGrid.destroy()
    draw()
  }
  anim.animate([opPoint.x, opPoint.y, 1], 2)
})

document.querySelector('#sub-btn').addEventListener('click', () => {
  if (!opPoint.visible) return
  let opGrid = new Grid()
  opGrid.points.add(GridPoint.temp())
  opGrid.opacity = 0
  let opArrow = new Arrow(opPoint.value, new ComplexNumber(0, 0))
  let anim = new AnimatedValue([0, 0, 0])
  anim.onupdate = () => {
    rootGrid.x = anim.value[0]
    rootGrid.y = anim.value[1]
    draw()
    opArrow.progress = anim.value[2]
    opArrow.render()
  }
  anim.onend = () => {
    currentPoint.value = currentPoint.value.sub(opPoint.value)
    opPoint.visible = false
    rootGrid.x = rootGrid.y = 0
    opGrid.destroy()
    draw()
  }
  anim.animate([-opPoint.x, -opPoint.y, 1], 2)
})

document.querySelector('#mul-btn').addEventListener('click', () => {
  if (!opPoint.visible) return
  let opGrid = new Grid()
  opGrid.opacity = 0
  let tpoint = GridPoint.temp()
  tpoint.x = 1
  opGrid.points.add(opPoint)
  rootGrid.points.delete(opPoint)
  rootGrid.points.add(tpoint)

  let opArrow = new Arrow(new ComplexNumber(1, 0), opPoint.value)

  let anim = new AnimatedValue([0, 1, 0])
  anim.onupdate = () => {
    rootGrid.rotate = anim.value[0]
    rootGrid.scale = anim.value[1]
    draw()
    opArrow.progress = anim.value[2]
    opArrow.render()
  }

  anim.onend = () => {
    currentPoint.value = currentPoint.value.mul(opPoint.value)
    rootGrid.points.delete(tpoint)
    rootGrid.points.add(opPoint)
    opPoint.visible = false
    rootGrid.rotate = 0
    rootGrid.scale = 1
    opGrid.destroy()
    draw()
  }

  let rot = Math.atan2(opPoint.y, opPoint.x)
  let scale = Math.hypot(opPoint.x, opPoint.y)

  anim.animate([rot, scale, 1], 2)
})

document.querySelector('#div-btn').addEventListener('click', () => {
  if (!opPoint.visible) return
  let opGrid = new Grid()
  opGrid.opacity = 0
  let tpoint = GridPoint.temp()
  tpoint.x = 1
  opGrid.points.add(tpoint)

  let opArrow = new Arrow(opPoint.value, new ComplexNumber(1, 0))

  let anim = new AnimatedValue([0, 1, 0])
  anim.onupdate = () => {
    rootGrid.rotate = anim.value[0]
    rootGrid.scale = anim.value[1]
    draw()
    opArrow.progress = anim.value[2]
    opArrow.render()
  }

  anim.onend = () => {
    currentPoint.value = currentPoint.value.div(opPoint.value)
    opPoint.visible = false
    rootGrid.rotate = 0
    rootGrid.scale = 1
    opGrid.destroy()
    draw()
  }

  let rot = Math.atan2(opPoint.y, opPoint.x)
  let scale = Math.hypot(opPoint.x, opPoint.y)

  if (opPoint.x === 0 && opPoint.y === 0) {
    rot = Math.PI * 4
    scale = 0
    opGrid.destroy()
  }

  anim.animate([-rot, 1 / scale, 1], 2)
})

let xscl = rscale
document.querySelector('#zoomi-btn').addEventListener('click', () => {
  let anim = new AnimatedValue(rscale)
  anim.onupdate = () => {
    rscale = anim.value
    updateSize()
    draw()
  }
  xscl *= 1.25
  anim.animate([xscl], 0.5)
})

document.querySelector('#zoomo-btn').addEventListener('click', () => {
  let anim = new AnimatedValue(rscale)
  anim.onupdate = () => {
    rscale = anim.value
    updateSize()
    draw()
  }
  xscl /= 1.25
  anim.animate([xscl], 0.5)
})

draw()
