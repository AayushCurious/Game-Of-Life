let dims = [10, 10];
let cells;
let currentGen, nextGen;
let DELAY_MS = 500;
let ALIVE_PROBABILITY = 0.5;
let paused = false;
let sound = true;
let generations = 0;
let population = 0;
const libModal = new bootstrap.Modal(document.getElementById('library-modal'));
const audioCtx = new (AudioContext || webkitAudioContext)();

const playTone = () => {
    const osc = audioCtx.createOscillator();
    const freq = (population / (dims[0] * dims[1])) * 1700 + 300;
    osc.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.start();
    osc.stop(audioCtx.currentTime + (DELAY_MS / 1000));
}

const initPickr = () => {
    const pickr = Pickr.create({
        el: '.pickr',
        theme: 'classic',
        conparison: false,
        swatches: null,
        default: 'rgba(41, 71, 112,1)',
        components: {
            preview: true,
            opacity: true,
            hue: true,
            interaction: {
                hex: true,
                rgba: true,
                hsla: true,
                hsva: false,
                cmyk: true,
                input: true,
                clear: false,
                save: false
            }
        }
    });

    pickr.on('change', (color, src, instance) => {
        const root = document.documentElement;
        root.style.setProperty('--color', color.toRGBA().toString());
        const [h, s, l, a] = color.toHSLA();
        root.style.setProperty('--h1-color', `hsl(${h}deg ${s}% ${l > 50 ? l - 30 : l + 30}%)`);
        instance.applyColor();
    });
}

const delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const toggleCellState = function (idx) {
    const state = Number(!Number(this.dataset.state))
    state === 1 ? population++ : population--;
    updatePopulation();
    this.dataset.state = state;
    currentGen[idx] = state;
}

const getNeighbourStates = (x, y) => {
    const states = {
        live: 0,
        dead: 0
    };
    if (y - 1 >= 0) currentGen[dims[1] * (y - 1) + x] === 0 ? states.dead++ : states.live++;
    if (y - 1 >= 0 && x - 1 >= 0) currentGen[dims[1] * (y - 1) + x - 1] === 0 ? states.dead++ : states.live++;
    if (y - 1 >= 0 && x + 1 < dims[1]) currentGen[dims[1] * (y - 1) + x + 1] === 0 ? states.dead++ : states.live++;
    if (y + 1 < dims[0] && x - 1 >= 0) currentGen[dims[1] * (y + 1) + x - 1] === 0 ? states.dead++ : states.live++;
    if (y + 1 < dims[0] && x + 1 < dims[1]) currentGen[dims[1] * (y + 1) + x + 1] === 0 ? states.dead++ : states.live++;
    if (x + 1 < dims[1]) currentGen[dims[1] * y + x + 1] === 0 ? states.dead++ : states.live++;
    if (x - 1 >= 0) currentGen[dims[1] * y + x - 1] === 0 ? states.dead++ : states.live++;
    if (y + 1 < dims[0]) currentGen[dims[1] * (y + 1) + x] === 0 ? states.dead++ : states.live++;
    return states;
}

const initGrid = (random = false) => {
    currentGen = [];
    document.querySelector('#grid').innerHTML = '';
    for (let i = 0; i < dims[0] * dims[1]; i++) {
        const div = document.createElement('div');
        const rand = random ? Math.random() > ALIVE_PROBABILITY ? 0 : 1 : 0;
        if (rand) population++;
        updatePopulation();
        currentGen.push(rand);
        div.setAttribute('data-state', rand);
        document.querySelector('#grid').append(div);
        div.addEventListener('mousedown', toggleCellState.bind(div, i));
        div.addEventListener('mouseover', (e) => {
            if (e.buttons !== 1) return;
            toggleCellState.call(div, i);
        });
    }
    cells = document.querySelectorAll('#grid div');
}

const simulate = async () => {
    let changes;
    while (changes !== 0 && !paused) {
        changes = 0;
        nextGen = [...currentGen];
        await delay(DELAY_MS);
        currentGen.forEach(async (cell, i) => {
            const x = i % dims[1];
            const y = Math.floor(i / dims[1]);
            const neighbours = getNeighbourStates(x, y);
            if (cell === 0 && neighbours.live === 3) {
                nextGen[i] = 1;
                cells[i].dataset.state = 1;
                changes++;
                population++;
            } else if (cell === 1 && neighbours.live !== 2 && neighbours.live !== 3) {
                nextGen[i] = 0;
                cells[i].dataset.state = 0;
                changes++;
                population--;
            }
            updatePopulation();
        });
        if (sound) playTone();
        currentGen = nextGen;
        generations++;
        updateGenerations();
    }
    console.log('ended');
}

const setDims = function (
    rows = window.getComputedStyle(document.documentElement).getPropertyValue('--rows'),
    cols = window.getComputedStyle(document.documentElement).getPropertyValue('--cols')
) {
    dims = [rows, cols];
    document.documentElement.style.setProperty('--rows', rows);
    document.documentElement.style.setProperty('--cols', cols);
}

const setDelay = function () {
    DELAY_MS = this.value;
}

const setProbability = function () {
    ALIVE_PROBABILITY = this.value;
}

// updated function here
const play = () => {
    if (paused) {
        paused = false;
        document.querySelector('#play').innerHTML = `
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        `;
        simulate();
    }
    else {
        paused = true;
        document.querySelector('#play').innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        `;
    }
}

const resetStats = () => {
    generations = 0;
    population = 0;
}

const clearGrid = async () => {
    paused = false;
    play(); // correction-new-bug-fix
    return new Promise((resolve) => {
        setTimeout(() => {
            resetStats();
            updatePopulation();
            updateGenerations();
            cells.forEach((div) => div.dataset.state = 0);
            currentGen = new Array(dims[0] * dims[1]).fill(0);
            nextGen = [];
            resolve();
        }, DELAY_MS);
    })
}

const loadPattern = (img) => {
    const { rows, cols, live } = img.dataset;
    setDims(rows, cols);
    initGrid();
    live.split(',').forEach((idx) => {
        cells[idx].dataset.state = 1;
        currentGen[idx] = 1;
        population++;
        updatePopulation();
    });
}

const updateGenerations = () => {
    document.querySelector('#generation').textContent = generations;
}

const updatePopulation = () => {
    document.querySelector('#population').textContent = population;
}

const resizeGrid = () => {
    const root = document.documentElement;
    const width = root.offsetWidth;
    let height = root.offsetHeight;
    let cellWidth;
    height -= document.querySelector('nav').offsetHeight;
    height -= document.querySelector('footer').offsetHeight;
    if (width < height) {
        cellWidth = width / dims[1];
        if (cellWidth * dims[0] > height) {
            cellWidth = height / dims[0];
        }
    }
    else {
        cellWidth = height / dims[0];
        if (cellWidth * dims[1] > width) {
            cellWidth = width / dims[1];
        };
    }
    root.style.setProperty('--cell-width', `${cellWidth}px`);
}

document.querySelector('#rows').addEventListener('change', async function () {
    await clearGrid();
    setDims(this.value);
    initGrid(true);
    resizeGrid();
});
document.querySelector('#cols').addEventListener('change', async function () {
    await clearGrid();
    setDims(undefined, this.value);
    initGrid(true);
    resizeGrid();
});
document.querySelector('#delay').addEventListener('input', setDelay);
document.querySelector('#liveProbability').addEventListener('input', setProbability);
document.querySelector('#random').addEventListener('click', async () => {
    await clearGrid();
    initGrid(true);
});
document.querySelector('#play').addEventListener('click', play);
document.querySelector('#clear').addEventListener('click', clearGrid);
document.querySelectorAll('#library-modal img').forEach(img => {
    img.addEventListener('click', async () => {
        await clearGrid();
        loadPattern(img);
        resizeGrid();
        libModal.hide();
    });
});
document.querySelector('#mute').addEventListener('click', function () {
    sound = true;
    this.classList.add('d-none');
    document.querySelector('#unmute').classList.remove('d-none');
});
document.querySelector('#unmute').addEventListener('click', function () {
    sound = false;
    this.classList.add('d-none');
    document.querySelector('#mute').classList.remove('d-none');
});
document.querySelectorAll("svg[tabindex]").forEach((svg) => {
    svg.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key !== ' ' && e.key !== 'Enter') return;
        svg.dispatchEvent(new Event('click'));
    });
});

window.addEventListener('resize', resizeGrid);
window.addEventListener('load', resizeGrid);
window.addEventListener('keydown', (e) => {
    (e.key==' ')&&play();
});

initPickr()
play()
initGrid(true)
