class ComplexNumber {
  constructor (r, i) {
    this.real = r || 0
    this.imag = i || 0
  }
  toString () {
    let r = this.real ? (+this.real.toFixed(2)).toString() || '' : ''
    let i = this.imag ? ((Math.abs(this.imag) !== 1 ? Math.abs(+this.imag.toFixed(2)) : '') + 'i') : ''
    return (r + (r && i ? (this.imag >= 0 ? '+' : '-') : (i && this.imag < 0 ? '-' : '')) + i) || '0'
  }
  get absolute () {
    return Math.hypot(this.real, this.imag)
  }
  get angle () {
    return Math.atan2(this.imag, this.real)
  }
  add (c) {
    return new ComplexNumber(this.real + c.real, this.imag + c.imag)
  }
  sub (c) {
    return new ComplexNumber(this.real - c.real, this.imag - c.imag)
  }
  mul (c) {
    let r = this.real * c.real - this.imag * c.imag
    let i = this.real * c.imag + this.imag * c.real
    return new ComplexNumber(r, i)
  }
  div (c) {
    let r = (this.real * c.real + this.imag * c.imag) / (c.real * c.real + c.imag * c.imag)
    let i = (this.imag * c.real - this.real * c.imag) / (c.real * c.real + c.imag * c.imag)
    return new ComplexNumber(r, i)
  }
  static parse (str) {
    str = str.split(/[+-]/g)
    let r = 0
    let i = 0
    for (let part of str) {
      if (part.match(/i$/)) i += part.length === 1 ? 1 : parseFloat(part)
      r += parseFloat(part)
    }
    return new ComplexNumber(r, i)
  }
}
