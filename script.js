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

    // A_improved is the GMFM category the child reached at the end of the interval
    const A_improved = solveForA(endScoreActual, endAge);

    document.getElementById('resExpected').innerText = expectedEndScore.toFixed(2);
    document.getElementById('resENE').innerText = ENE.toFixed(2);
    document.getElementById('resRatio').innerText = ratio.toFixed(2);

    updateChart(A, A_improved, startAge, endAge, startScore, endScoreActual);
}

function updateChart(A, A_improved, startAge, endAge, startScore, endScoreActual) {
    const expectedCurvePast = [];
    const expectedCurveFuture = [];
    const improvedCurveFuture = [];
    const improvementShading = [];
    
    // Get theme colors
    const style = getComputedStyle(document.documentElement);
    const textCol = style.getPropertyValue('--text-secondary').trim();
    const gridCol = style.getPropertyValue('--grid-line').trim();
    const primaryCol = style.getPropertyValue('--primary').trim();
    const primaryLightCol = style.getPropertyValue('--primary-light').trim();
    const greenCol = '#10b981';
    const greenLightCol = 'rgba(16, 185, 129, 0.2)';

    // Generate Expected Curve (Past & Future)
    for (let i = 0; i <= 15; i += 0.05) {
        const y = gmfmModel(i, A);
        if (i <= startAge) {
            expectedCurvePast.push({ x: i, y: y });
        } else {
            // Include startAge as first point of future curve to avoid gap
            if (expectedCurveFuture.length === 0) {
                expectedCurveFuture.push({ x: startAge, y: gmfmModel(startAge, A) });
            }
            expectedCurveFuture.push({ x: i, y: y });
        }
    }

    // Generate Measured Projection (Future)
    for (let i = endAge; i <= 15; i += 0.05) {
        improvedCurveFuture.push({ x: i, y: gmfmModel(i, A_improved) });
    }

    // Generate Shading Data (Polygon between growth curve and straight improvement line)
    // Points along expected curve from startAge to endAge
    for (let i = startAge; i <= endAge; i += 0.05) {
        improvementShading.push({ x: i, y: gmfmModel(i, A) });
    }
    improvementShading.push({ x: endAge, y: gmfmModel(endAge, A) });
    // Points for the straight line back to start
    improvementShading.push({ x: endAge, y: endScoreActual });
    improvementShading.push({ x: startAge, y: startScore });

    // Reference Curves (Categories I-V)
    const refValues = [{ label: 'I', a: 87.80 }, { label: 'II', a: 67.63 }, { label: 'III', a: 53.98 }, { label: 'IV', a: 40.39 }, { label: 'V', a: 22.80 }];
    const refDatasets = refValues.map(ref => {
        const data = [];
        for (let i = 0; i <= 15; i += 0.5) data.push({ x: i, y: gmfmModel(i, ref.a) });
        return {
            label: `Cat ${ref.label}`,
            data: data,
            borderColor: 'rgba(245, 158, 11, 0.2)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 5
        };
    });

    const datasets = [
        ...refDatasets,
        {
            label: 'Improvement Shading',
            data: improvementShading,
            backgroundColor: greenLightCol,
            borderColor: 'transparent',
            fill: true,
            pointRadius: 0,
            tension: 0,
            order: 4
        },
        {
            label: 'Measured Projection',
            data: improvedCurveFuture,
            borderColor: greenCol,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 3
        },
        {
            label: 'Measured Improvement',
            data: [{ x: startAge, y: startScore }, { x: endAge, y: endScoreActual }],
            borderColor: greenCol,
            borderWidth: 3,
            pointRadius: 0,
            fill: false,
            order: 2
        },
        {
            label: 'Expected Future',
            data: expectedCurveFuture,
            borderColor: primaryCol,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 1
        },
        {
            label: 'Expected Curve',
            data: expectedCurvePast,
            borderColor: primaryCol,
            borderWidth: 3,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 0
        },
        {
            label: 'Ref Points',
            data: [
                { x: startAge, y: startScore },
                { x: endAge, y: endScoreActual }
            ],
            backgroundColor: '#ef4444',
            borderColor: '#ffffff',
            borderWidth: 2,
            pointRadius: 7,
            hoverRadius: 8,
            hitRadius: 12,
            pointHoverBackgroundColor: '#ef4444',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            type: 'scatter',
            showLine: false,
            order: -1
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
                            // End Point Drag (on the Measured Improvement Line)
                            const sAgeVal = parseInt(startAgeInput.value) / 12;
                            const startScoreVal = parseFloat(startScoreInput.value) || 0;
                            
                            // 1. Update Interval
                            const intMonths = Math.round((dragX - sAgeVal) * 12);
                            intervalInput.value = Math.max(1, Math.min(180, intMonths));
                            
                            // 2. Update Score Change
                            const scoreChangeInput = document.getElementById('scoreChange');
                            const dragY = Math.max(0, Math.min(100, value.y));
                            scoreChangeInput.value = (dragY - startScoreVal).toFixed(1);

                            // Force visual dot to snap (X only, Y follows drag)
                            value.x = sAgeVal + (parseInt(intervalInput.value)/12);
                        }

                        // Sync Sliders
                        ['startAge', 'startScore', 'interval', 'scoreChange'].forEach(id => {
                            const inputEle = document.getElementById(id);
                            if (!inputEle) return;
                            const val = inputEle.value;
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
