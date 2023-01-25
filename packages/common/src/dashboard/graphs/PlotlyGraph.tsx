import { Table } from 'antd';
import React, { Component } from 'react';
import Plot from 'react-plotly.js';

export default class PlotlyGraph extends Component<any, any> {
  getMargins = () => {
    let hasTitle = false;
    if (this.props.currentBlock !== undefined) {
      hasTitle = this.props.currentBlock.config.configStyle.title.isVisible
    }
    return {
      l: this.props.layout.YAxis.title ? 60 : 40,
      r: 10,
      b: 30,
      t: hasTitle ? 25 : 5,
      pad: 4,
    }
  }

  // TODO https://plotly.com/javascript/sliders/
  // https://plotly.com/javascript/gapminder-example/

  getOrderedUniqueX = () => {
    const concat_x: any[] = []
    for (const dataElement of this.props.data) {
      concat_x.push(...dataElement.x)
    }

    return [...new Set(concat_x)].sort((a,b) => a-b)
  }

  filterDataByX= (dataElement, x) => {
    const idx = (dataElement.x.filter((element) => Number(element) <= x)).length
    return dataElement.y.slice(0, idx)
  }

  getSliderConfigs = () => {
    const frames: any[] = []
    const sliderSteps: any[] = []
    const uniq_x = this.getOrderedUniqueX()

    for (const [idx, x] of uniq_x.entries()){
      // Frame
      const frame: any = {
        data: [],
        name: x,
        layout:{
          xaxis: {
            range: [uniq_x[0], uniq_x[idx]]
          }
        } //update range of xaxis
      }
      for (const dataElement of this.props.data){
        frame['data'].push({
          name: dataElement.name,
          x: uniq_x.slice(0, idx+1),
          y: this.filterDataByX(dataElement, x)
        })
      }
      frames.push(frame)

      // Slider step
      const sliderStep = {
        label: x,
        method: 'animate',
        args: [[x], {
          mode: 'immediate',
          frame: {redraw: false, duration: 0},
          transition: {duration: 0}
        }]
      }
      sliderSteps.push(sliderStep)
    }

    const sliderConfig= {
      pad: {t: 60},
      x: 0.05,
      len: 0.95,
      currentvalue: {
        xanchor: 'right',
        prefix: 'year: ',
        font: {
          color: '#888',
          size: 20
        }
      },
      // By default, animate commands are bound to the most recently animated frame:
      steps: sliderSteps
    }


    const playButtonConfig =  {
      type: 'buttons',
      showactive: false,
      x: 0.05,
      y: 0,
      xanchor: 'right',
      yanchor: 'top',
      pad: {t: 90, r: 20},
      buttons: [{
        label: 'Play',
        method: 'animate',
        args: [null, {
          fromcurrent: true,
          frame: {redraw: false, duration: 1000},
          transition: {duration: 0}
        }]
      }]
    }

    return [frames, sliderConfig, playButtonConfig]
  }

  // layout = {...this.props.layout, sliders, updatemenus}

  render() {
    const { currentBlock } = this.props;
    const config = {
      displayModeBar: false, // this is the line that hides the bar.
      editable: false,
      showlegend: currentBlock.config.configStyle.showLegend,
      showTitle: false,
    };
    let layout: any = {
      width: this.props.width,
      height: this.props.height,
      legend: {
        // x: -0.25,
        orientation: "h",
      },
      autosize: false,
      margin: this.getMargins(),
      font: {
        size: 10,
      },
      yaxis: this.props.layout.YAxis
    };
    if (currentBlock.config.configStyle.title.isVisible) {
      layout = {
        ...layout,
        title: currentBlock.config.configStyle.title.value,
      };
    }

    // SLIDER
    const [frames, sliderConfig, playButtonConfig] = this.getSliderConfigs()

    layout["sliders"]=[sliderConfig]
    layout["updatemenus"]=[playButtonConfig]

    const plotConfig = {}

    return currentBlock.config.configStyle.graphType === 'table' && this.props.data.values.length > 0 ? (
      <Table
        // Make the height 100% of the div (not working)
        style={{ minHeight: '100%' }}
        columns={this.props.data.columns}
        dataSource={this.props.data.values}
        pagination={false}
        scroll={{ x: 3000, y: this.props.height - 40 }}
        bordered
      />
    ) : (
      <Plot
        key={this.props.currentBlock.id}
        data={this.props.data}
        {...plotConfig}
        layout={layout}
        config={config}
        frames={frames}
      />
    );
  }
}

