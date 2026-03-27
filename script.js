let chart;

function gmfmModel(x, A) {
    // x is age in years
    return A * (Math.exp((-2.859e-5 * A + 0.003615) * x) - Math.exp((0.005204 * A - 0.9224) * x));
}

function solveForA(targetY, ageYears) {
    let low = 5, high = 150, mid;
    for (let i = 0; i < 20; i++) {
        mid = (low + high) / 2;
        if (gmfmModel(ageYears, mid) < targetY) low = mid;
        else high = mid;
    }
    return mid;
}

function calculate() {
    const startAgeInput = document.getElementById('startAge');
    const startAgeSlider = document.getElementById('startAgeSlider');
    const intervalInput = document.getElementById('interval');
    const intervalSlider = document.getElementById('intervalSlider');
    const startScoreInput = document.getElementById('startScore');
    const scoreChangeInput = document.getElementById('scoreChange');

    if (!startAgeInput || !startAgeSlider || !intervalInput || !intervalSlider) return;

    // Dynamic Bounding Logic: StartAge + Interval <= 180 months
    let sAgeVal = parseInt(startAgeInput.value) || 0;
    let intVal = parseInt(intervalInput.value) || 0;

    const maxIntAllowed = Math.max(0, 180 - sAgeVal);
    intervalInput.max = maxIntAllowed;
    intervalSlider.max = maxIntAllowed;
    if (intVal > maxIntAllowed) {
        intVal = maxIntAllowed;
        intervalInput.value = intVal;
        intervalSlider.value = intVal;
    }

    const maxAgeAllowed = Math.max(0, 180 - intVal);
    startAgeInput.max = maxAgeAllowed;
    startAgeSlider.max = maxAgeAllowed;
    if (sAgeVal > maxAgeAllowed) {
        sAgeVal = maxAgeAllowed;
        startAgeInput.value = sAgeVal;
        startAgeSlider.value = sAgeVal;
    }

    const startAge = sAgeVal / 12;
    const startScore = parseFloat(startScoreInput.value) || 0;
    const interval = intVal / 12;
    const scoreChange = parseFloat(scoreChangeInput.value) || 0;
    
    const A = solveForA(startScore, startAge);
    const endAge = startAge + interval;
    const expectedEndScore = gmfmModel(endAge, A);
    const ENE = expectedEndScore - startScore;
    
    // endScoreActual is for the chart line and ratio calculation
    const endScoreActual = startScore + scoreChange;
    const ratio = ENE !== 0 ? scoreChange / ENE : 0;

    document.getElementById('resExpected').innerText = expectedEndScore.toFixed(2);
    document.getElementById('resENE').innerText = ENE.toFixed(2);
    document.getElementById('resRatio').innerText = ratio.toFixed(2);

    updateChart(A, startAge, endAge, Math.max(0, Math.min(100, endScoreActual)));
}

function updateChart(A, startAge, endAge, endScoreActual) {
    const curveData = [];
    const intervalShadeData = [];
    
    // Get theme colors
    const style = getComputedStyle(document.documentElement);
    const textCol = style.getPropertyValue('--text-secondary').trim();
    const gridCol = style.getPropertyValue('--grid-line').trim();
    const primaryCol = style.getPropertyValue('--primary').trim();
    const primaryLightCol = style.getPropertyValue('--primary-light').trim();

    // Population of Curve Data
    for (let i = 0; i <= 15; i += 0.05) {
        curveData.push({ x: i, y: gmfmModel(i, A) });
    }

    // Population of Shading Data
    const numShPoints = 60;
    const shadeStep = (endAge - startAge) / numShPoints;
    for (let j = 0; j <= numShPoints; j++) {
        const xS = startAge + j * shadeStep;
        intervalShadeData.push({ x: xS, y: gmfmModel(xS, A) });
    }

    // Reference Curves (Categories I-V)
    const refValues = [{ label: 'I', a: 87.80 }, { label: 'II', a: 67.63 }, { label: 'III', a: 53.98 }, { label: 'IV', a: 40.39 }, { label: 'V', a: 22.80 }];
    const refDatasets = refValues.map(ref => {
        const data = [];
        for (let i = 0; i <= 15; i += 0.5) data.push({ x: i, y: gmfmModel(i, ref.a) });
        return {
            label: `Cat ${ref.label}`,
            data: data,
            borderColor: 'rgba(245, 158, 11, 0.25)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 4
        };
    });

    const datasets = [
        ...refDatasets,
        {
            label: 'Interval Influence',
            data: intervalShadeData,
            backgroundColor: primaryLightCol,
            borderColor: 'transparent',
            fill: 'origin',
            pointRadius: 0,
            tension: 0.1,
            order: 3
        },
        {
            label: 'Measured Level',
            data: [{ x: 0, y: endScoreActual }, { x: 15, y: endScoreActual }],
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            order: 2
        },
        {
            label: 'Active Curve',
            data: curveData,
            borderColor: primaryCol,
            borderWidth: 3,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 1
        },
        {
            label: 'Ref Points',
            data: [
                { x: startAge, y: gmfmModel(startAge, A) },
                { x: endAge, y: gmfmModel(endAge, A) }
            ],
            backgroundColor: '#ef4444',
            borderColor: '#ffffff',
            borderWidth: 2,
            pointRadius: 7,
            hoverRadius: 8, // Force it to stay large (or slightly larger) on hover
            hitRadius: 12, // Larger hit area to make it easier to catch/drag
            pointHoverBackgroundColor: '#ef4444',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            type: 'scatter',
            showLine: false,
            order: 0
        }
    ];

    if (chart) {
        chart.data.datasets = datasets;
        chart.options.scales.x.title.color = textCol;
        chart.options.scales.x.grid.color = gridCol;
        chart.options.scales.x.ticks.color = textCol;
        chart.options.scales.y.title.color = textCol;
        chart.options.scales.y.grid.color = gridCol;
        chart.options.scales.y.ticks.color = textCol;
        chart.update('none'); // Update without animation for performance
        return;
    }

    const ctx = document.getElementById('gmfmChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { datasets: datasets },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }, // Disables standard hover tooltips
                dragData: {
                    dragX: true,
                    showTooltip: false, // Disables the special drag tooltip
                    onDragStart: (e, datasetIndex, index) => {
                        // Only draggable for 'Ref Points'
                        if (datasetIndex !== chart.data.datasets.length - 1) return false;
                    },
                    onDrag: (e, datasetIndex, index, value) => {
                        const startAgeInput = document.getElementById('startAge');
                        const startScoreInput = document.getElementById('startScore');
                        const intervalInput = document.getElementById('interval');

                        const dragX = Math.max(0, Math.min(15, value.x));
                        const dragY = Math.max(0, Math.min(100, value.y));

                        if (index === 0) {
                            // Start Point Drag
                            const solvedA = solveForA(dragY, dragX);
                            const snappedY = gmfmModel(dragX, solvedA);
                            
                            startAgeInput.value = Math.round(dragX * 12);
                            startScoreInput.value = snappedY.toFixed(1);

                            // Force visual dot to snap back during the pull
                            value.x = dragX;
                            value.y = snappedY;
                        } else {
                            // End Point Drag
                            const sAgeVal = parseInt(startAgeInput.value) / 12;
                            const intMonths = Math.round((dragX - sAgeVal) * 12);
                            intervalInput.value = Math.max(1, Math.min(180, intMonths));
                            
                            const finalAge = sAgeVal + (parseInt(intervalInput.value)/12);
                            const solvedA = solveForA(dragY, finalAge);
                            const snappedY = gmfmModel(finalAge, solvedA);
                            
                            const newStartScore = gmfmModel(sAgeVal, solvedA);
                            startScoreInput.value = Math.max(0, Math.min(100, newStartScore)).toFixed(1);

                            // Force visual dot to snap back
                            value.x = finalAge;
                            value.y = snappedY;
                        }

                        // Sync Sliders
                        ['startAge', 'startScore', 'interval'].forEach(id => {
                            const val = document.getElementById(id).value;
                            const slider = document.getElementById(id + 'Slider');
                            if (slider) slider.value = val;
                        });
                        calculate();
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { 
                        display: true, 
                        text: 'Age (Years)', 
                        color: textCol,
                        font: { size: 18, weight: 'bold' }
                    },
                    min: 0,
                    max: 15,
                    grid: { color: gridCol },
                    ticks: { color: textCol, font: { size: 14 } }
                },
                y: {
                    type: 'linear',
                    title: { 
                        display: true, 
                        text: 'GMFM-66 Score', 
                        color: textCol,
                        font: { size: 18, weight: 'bold' }
                    },
                    min: 0,
                    max: 100,
                    grid: { color: gridCol },
                    ticks: { color: textCol, font: { size: 14 } }
                }
            }
        }
    });
}

function setupSync(numId, sliderId) {
    const numInput = document.getElementById(numId);
    const sliderInput = document.getElementById(sliderId);
    if (!numInput || !sliderInput) return;
    sliderInput.addEventListener('input', () => { numInput.value = sliderInput.value; calculate(); });
    numInput.addEventListener('input', () => { sliderInput.value = numInput.value; calculate(); });
}

document.addEventListener('DOMContentLoaded', () => {
    setupSync('startAge', 'startAgeSlider');
    setupSync('startScore', 'startScoreSlider');
    setupSync('interval', 'intervalSlider');
    setupSync('scoreChange', 'scoreChangeSlider');
    
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const next = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            
            // Icon Swap
            const icon = document.getElementById('themeIcon');
            if (next === 'dark') {
                icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
            } else {
                icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>';
            }
            calculate();
        });
    }

    calculate();
});
