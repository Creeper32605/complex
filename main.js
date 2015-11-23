'use strict';
{
	let cnv = document.querySelector('#complex-canvas');
	// why can't canvas support @2x by default?
	let d = window.devicePixelRatio || 1;
	// dummy values
	let width = 1;
	let height = 1;
	// pixels per unit on grid
	let rscale = 50;
	let scale = rscale * d;
	let draw;

	let updateSize = function() {
		// just in case
		d = window.devicePixelRatio || 1;

		width = parseInt(getComputedStyle(cnv).width);
		height = parseInt(getComputedStyle(cnv).height);
		cnv.width = width * d;
		cnv.height = height * d;
		scale = rscale * d;
		draw();
	};
	window.onresize = updateSize;
	let ctx = cnv.getContext('2d');

	// simple wrapper for color
	let Color = class Color {
		constructor(r, g, b, a) {
			this.r = Math.round(Math.min(255, Math.max(0, r)));
			this.g = Math.round(Math.min(255, Math.max(0, g)));
			this.b = Math.round(Math.min(255, Math.max(0, b)));
			this.a = Math.min(1, Math.max(0, a));
		}
		clone(or, og, ob, oa) {
			return new Color(or || this.r, og || this.g, ob || this.b, oa || this.a);
		}
		fade(a) {
			return this.clone(null, null, null, this.a * a);
		}
		get rgba() {
			return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
		}
	};

	// background color
	let background = '#091230';
	// grid color
	let grid = new Color(255, 255, 255, 0.5);
	// grid color for lines at x=0 and y=0 and unit lines
	let gridM = new Color(255, 255, 255, 1);
	// point color
	let point = new Color(137, 183, 255, 1);

	// draws a grid with origin offset (dx|dy), rotation dr, scale ds, opacity dp and points pts
	let drawGrid = function(dx, dy, dr, ds, dp, pts) {
		// find origin position
		let origx = (width * d / 2) + dx * scale;
		let origy = (height * d / 2) + dy * scale;

		// size of the grid that's going to be drawn
		// slightly bigger than both the width and height as it's the diagonal
		let size = Math.ceil(Math.sqrt(Math.pow(origx * 2, 2) + Math.pow(origy * 2, 2)));

		// boundaries on the unit grid
		let limitnx = (-(size / scale) - dx) * (1 / ds);
		let limitpx = ((size / scale) - dx) * (1 / ds);
		let limitny = (-(size / scale) - dy) * (1 / ds);
		let limitpy = ((size / scale) - dy) * (1 / ds);

		// apply opacity to colors
		let gMC = gridM.fade(dp || 0).rgba;
		let gC = grid.fade(dp || 0).rgba;
		let pC = point.fade(dp || 0).rgba;

		// put canvas coordinates (0|0) where the origin is and apply rest of transforms
		ctx.translate(origx, origy);
		ctx.scale(ds, ds);
		ctx.rotate(dr);
		// make sure lines are always the same width
		ctx.lineWidth = 1 / ds;
		if (ctx.lineWidth == Infinity) ctx.lineWidth = 0; // I wish javascript wouldn't do this
		// grid line interval
		let inc = 1;

		if (ds < 0.1) {
			// if scale is [quite small] make interval larger to avoid terrible lag
			inc = Math.ceil(0.1 / ds);
			// make sure 0 isn't skipped
			limitnx = Math.ceil(limitnx / inc) * inc;
			limitny = Math.ceil(limitny / inc) * inc;
		}
		// draw grid lines
		for (let y = Math.ceil(limitny); y < limitpy; y += inc) {
			if (y == 0)
				ctx.strokeStyle = gMC;
			else
				ctx.strokeStyle = gC;
			ctx.beginPath();
			ctx.moveTo(-size * scale * inc, y * scale);
			ctx.lineTo(size * scale * inc, y * scale);
			ctx.stroke();
		}
		for (let x = Math.ceil(limitnx); x < limitpx; x += inc) {
			ctx.beginPath();
			if (x == 0)
				ctx.strokeStyle = gMC;
			else
				ctx.strokeStyle = gC;
			ctx.moveTo(x * scale, -size * scale * inc);
			ctx.lineTo(x * scale, size * scale * inc);
			ctx.stroke();
		}
		if (ds >= 0.1) {
			// draw unit lines if the grid isn't too small

			// unit lines will resemble normal distribution histographs
			let sq2p = Math.min((1 / ds), 1) * scale * 1 / (0.8 * Math.sqrt(2 * Math.PI));
			let id3s = (1 / ds) * 3 * size / scale;

			for (let x = Math.ceil(limitnx); x < limitpx; x += inc) {
				ctx.strokeStyle = gMC;
				let usize = sq2p * Math.pow(Math.E, -(Math.pow(x + dx, 2)/ id3s));
				ctx.beginPath();
				ctx.moveTo(x * scale, -usize);
				ctx.lineTo(x * scale, usize);
				ctx.stroke();
			}
			for (let y = Math.ceil(limitny); y < limitpy; y += inc) {
				ctx.strokeStyle = gMC;
				let usize = sq2p * Math.pow(Math.E, -(Math.pow(y + dy, 2)/ id3s));
				ctx.beginPath();
				ctx.moveTo(-usize, y * scale);
				ctx.lineTo(usize, y * scale);
				ctx.stroke();
			}
		}
		// points
		ctx.strokeStyle = pC;
		ctx.lineWidth = 2 / ds;
		// undo the rotation and scaling of the grid to make sure points always look the same
		let ptsc = 0.4 * (1 / ds);
		let ptnx = -(Math.cos(dr + Math.PI * .25) * scale) * ptsc;
		let ptny =  (Math.sin(dr + Math.PI * .25) * scale) * ptsc;
		let ptpx =  (Math.cos(dr + Math.PI * .25) * scale) * ptsc;
		let ptpy = -(Math.sin(dr + Math.PI * .25) * scale) * ptsc;
		let p2nx = -(Math.cos(dr + Math.PI * .75) * scale) * ptsc;
		let p2ny =  (Math.sin(dr + Math.PI * .75) * scale) * ptsc;
		let p2px =  (Math.cos(dr + Math.PI * .75) * scale) * ptsc;
		let p2py = -(Math.sin(dr + Math.PI * .75) * scale) * ptsc;
		// draw each point
		for (let point of pts) {
			if (!point.v) continue;
			let px = point.x * scale;
			let py = -point.y * scale;
			ctx.beginPath();
			ctx.moveTo(px + ptnx, py + ptny);
			ctx.lineTo(px + ptpx, py + ptpy);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(px + p2nx, py + p2ny);
			ctx.lineTo(px + p2px, py + p2py);
			ctx.stroke();
		}

		// clean up
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	};

	let grids = [];
	draw = function() {
		ctx.fillStyle = background;
		ctx.fillRect(0, 0, width * d, height * d);

		for (let grid of grids) {
			grid.draw();
		}
	};
	updateSize();

	// animation things for grid animation
	let animDuration = 200;
	// expoInOut easing function
	let animItpl = function(i) {
		if (i==0) return 0;
		if (i==1) return 1;
		if ((i/=1/2) < 1) return 1/2 * Math.pow(2, 10 * (i - 1));
		return 1/2 * (-Math.pow(2, -10 * --i) + 2);
	};

	// simple implementation for complex numbers
	var ComplexNumber = class ComplexNumber {
		constructor(a, b) {
			this.real = a || 0;
			this.imaginary = b || 0;
		}
		toString() {
			let r = (this.real.toString()) || '';
			if (r == '0') r = '';
			let i = this.imaginary != '0' ? ((Math.abs(this.imaginary) != 1 ? Math.abs(this.imaginary) : '') + 'i') : '';
			return (r + (r && i ? (this.imaginary >= 0 ? '+' : '-') : (i && this.imaginary < 0 ? '-' : '')) + i) || '0';
		}
		get absolute() {
			return Math.sqrt(Math.pow(this.real, 2) + Math.pow(this.imaginary, 2));
		}
		get angle() {
			return Math.atan2(this.imaginary, this.real);
		}
		add(c) {
			return new ComplexNumber(this.real + c.real, this.imaginary + c.imaginary);
		}
		subtract(c) {
			return new ComplexNumber(this.real - c.real, this.imaginary - c.imaginary);
		}
		multiply(c) {
			let r = this.real * c.real - this.imaginary * c.imaginary;
			let i = this.real * c.imaginary + this.imaginary * c.real;
			return new ComplexNumber(r, i);
		}
		divide(c) {
			let r = (this.real * c.real - this.imaginary * c.imaginary) / (c.real * c.real + c.imaginary * c.imaginary);
			let i = (this.imaginary * c.real - this.real * c.imaginary) / (c.real * c.real + c.imaginary * c.imaginary);
			return new ComplexNumber(r, i);
		}
		static parse(str) {
			str = str.split(/(\+\-)/g);
			let real = 0;
			let imag = 0;
			for (let part of str) {
				if (part[part.length - 1] == 'i') {
					imag += part.length == 1 ? 1 : parseFloat(part);
				} else {
					real += parseFloat(part);
				}
			}
			return new ComplexNumber(real, imag);
		}
	};

	// simple point
	var GridPoint = class GridPoint {
		constructor(r, i) {
			this.value = new ComplexNumber(r, i);
			this.v = true;
		}
		get x() {
			return this.value.real;
		}
		set x(v) {
			this.value.real = v;
		}
		get y() {
			return this.value.imaginary;
		}
		set y(v) {
			this.value.imaginary = v;
		}
	};

	// a grid
	// can be transformed and animated
	var Grid = class Grid {
		constructor(iv) {
			this.state = {
				x: 0,  // current position
				y: 0,
				r: 0,
				s: 1,
				o: iv ? 0 : 1,

				// animation stuff
				sx: 0, // start positions
				sy: 0,
				sr: 0,
				ss: 1,
				so: 1,
				tx: 0, // target positions
				ty: 0,
				tr: 0,
				ts: 1,
				to: 1,
				abx: 0, // a[nimation](b[egin]|e[nd])[property] timestamps
				aex: 0,
				aby: 0,
				aey: 0,
				abr: 0,
				aer: 0,
				abs: 0,
				aes: 0,
				abo: 0,
				aeo: 0
			};
			this.points = [];
			grids.push(this);
			draw();
			// checks whether updating is needed every animation frame
			var loop = () => {
				let properties = ['x', 'y', 'r', 's', 'o'];
				let update = false;
				for (let idx of properties) {
					if (this.state['ab' + idx] < (this.state['ae' + idx] + 100)) {
						update = true;
					}
				}
				if (update) this.update();
				requestAnimationFrame(loop);
			};
			loop();
		}
		// safely removes this grid
		remove() {
			grids.splice(grids.indexOf(this), 1);
			draw();
		}
		// animates the grid to the desired properties
		// if an argument is null, the property won't be touched
		animate(dx, dy, dr, ds, dp, qs) {
			let properties = {
				x: dx,
				y: dy,
				r: dr,
				s: ds,
				o: dp
			};
			for (let idx in properties) {
				let prop = properties[idx];
				if (!prop && prop !== 0) continue;
				this.state['ab' + idx] = Date.now();
				this.state['ae' + idx] = Date.now() + animDuration * (qs || 1);
				this.state['s' + idx] = this.state[idx];
				this.state['t' + idx] = prop;
			}
			this.update();
		}
		// update all (potentially animating) properties
		update() {
			let now = Date.now();
			let properties = ['x', 'y', 'r', 's', 'o'];
			for (let idx of properties) {
				let ab = this.state['ab' + idx];
				let ae = this.state['ae' + idx];
				let sv = this.state['s' + idx];
				let ev = this.state['t' + idx];
				let ap = Math.min(1, (now - ab) / (ae - ab));
				let av = (animItpl(ap) * (ev - sv)) + sv;
				this.state[idx] = av;
			}
			draw();
		}
		draw() {
			drawGrid(this.state.x, -this.state.y, -this.state.r, this.state.s, this.state.o + 0.001, this.points);
		}
		addPoint(pt) {
			if (!(pt instanceof GridPoint)) return;
			this.points.push(pt);
		}
	};
}
{
	let inputDE = document.querySelector('#input');
	let resultDE = document.querySelector('#result');

	let rootGrid = new Grid();

	let currentPoint = new GridPoint();
	rootGrid.addPoint(currentPoint);
	let current = new ComplexNumber(0, 0);
	let renderOutput = function() {
		katex.render(current.toString(), resultDE);
	};
	// container for all temporary grids
	let opG = [];
	// setTimeout ID for currentPoint.v = true
	let cpV = 0;
	renderOutput();
	let applyInput = function(operator, number) {
		opG.push(new Grid(true));
		let w = opG.length - 1;
		opG[w].animate(0, 0, 0, 1, 1);
		opG[w].addPoint(new GridPoint(currentPoint.x, currentPoint.y));
		// animate the current operation
		if (operator == '+' || operator == '-') {
			let sign = (operator == '-') ? -1 : 1;
			opG[w].animate(sign * number.real, sign * number.imaginary, null, null, null, 3);
			if (operator == '+')
				current = current.add(number);
			else
				current = current.subtract(number);
		} else if (operator == '*') {
			opG[w].animate(null, null, number.angle, number.absolute, null, 3);
			current = current.multiply(number);
		} else if (operator == '/') {
			let fnr = current.divide(number);
			let scl = fnr.absolute / current.absolute;
			if (scl == Infinity) scl = 0;
			opG[w].animate(null, null, fnr.angle - current.angle, scl, null, 3);
			current = fnr;
		}
		currentPoint.x = current.real;
		currentPoint.y = current.imaginary;
		currentPoint.v = false;
		renderOutput();
		clearTimeout(cpV);
		cpV = setTimeout(() => {
			currentPoint.v = true;
		}, 1000);
		// remove the grid after a second
		setTimeout(() => {
			opG[w].animate(null, null, null, null, 0);
			setTimeout(() => {
				opG[w].remove();
				delete opG[w];
			}, 200);
		}, 1000);
	};

	// reset "everything" to zero when Reset is pressed
	document.querySelector('#resetb').addEventListener('click', function() {
		rootGrid.animate(0, 0, 0, 1, 0);
		current.real = 0;
		current.imaginary = 0;
		currentPoint.x = 0;
		currentPoint.y = 0;
		rootGrid.animate(0, 0, 0, 1, 1);
		renderOutput();
	});

	let operators = ['+', '-', '*', '/'];
	let operatorMap = {
		'+': '+',
		'-': '-',
		'*': '\\cdot ',
		'/': '\\div '
	};
	let currentOperator = '';
	let currentInput = '';
	let renderInput = function() {
		katex.render((operatorMap[currentOperator] || currentOperator) + currentInput, inputDE);
	};
	renderInput();
	document.addEventListener('keypress', function(e) {
		if (!e.key) e.key = String.fromCharCode(e.which);
		if (operators.indexOf(e.key) > -1) {
			if (currentOperator && curentInput) {
				let num = ComplexNumber.parse(currentInput);
				applyInput(currentOperator, num);
				currentOperator = '';
				currentInput = '';
			}
			currentOperator = e.key;
		} else if (e.key.match(/^\d$/)) {
			if (!currentOperator) currentOperator = '+';
			currentInput = '' + currentInput + e.key;
		} else if (e.key == 'i') {
			if (currentInput.indexOf('i') == -1) {
				if (!currentOperator) currentOperator = '+';
				currentInput = '' + currentInput + e.key;
			}
		}
		renderInput();
	});
	document.addEventListener('keydown', function(e) {
		if (e.which == 13 && currentInput) {
			e.preventDefault();
			let num = ComplexNumber.parse(currentInput);
			applyInput(currentOperator, num);
			currentOperator = '';
			currentInput = '';
		} else if (e.which == 8) {
			e.preventDefault();
			if (currentInput) {
				currentInput = currentInput.substr(0, currentInput.length - 1);
			} else {
				currentOperator = '';
			}
		}
		renderInput();
	});
}