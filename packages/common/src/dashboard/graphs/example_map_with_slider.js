var data = [{type: 'densitymapbox', lon: [10, 20, 30], lat: [15, 25, 35], z: [10, 8, 4]}];

var frames = [
    {
        name: 1,
        data: [{z:[10,8,4]}]
    },
    {
        name: 2,
        data: [{z:[4,10,8]}]
    },
]

var layout = {
    width: 600,
    height: 400,
    mapbox: {style: 'stamen-terrain'},
    sliders: [{
        pad: {t: 30},
        currentvalue: {
            xanchor: 'right',
            font: {
                color: '#888',
                size: 20
            }
        },
        steps: [
            {
                method: 'animate',
                label: 1,
                args: [[1], {
                    mode: 'immediate',
                    transition: {duration: 300},
                    frame: {duration: 300, redraw: true}}
                ]
            },
            {
                method: 'animate',
                label: 2,
                args: [[2], {
                    mode: 'immediate',
                    transition: {duration: 300},
                    frame: {duration: 300, redraw: true}}]
            }
        ]
    }]
};

Plotly.newPlot('myDiv', {data, layout, config: undefined, frames});
