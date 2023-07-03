import type { ColumnsType } from 'antd/lib/table';
import React, { Component } from 'react';
import BlockStyleModel from '../../../models/BlockStyleModel';
import MapBlock from '../../graphs/MapBlock';
import PlotlyGraph from '../../graphs/PlotlyGraph';
import PlotlyUtils from '../../graphs/PlotlyUtils';
import * as _ from 'lodash';
import PlotDataModel from "../../../models/PlotDataModel";
import withColorizer from "../../../hoc/colorizer/withColorizer";
import { stackGroups } from '../utils/StackGraphs';
import PieView from "./graphType/pie/PieView";
import { element } from 'prop-types';

class DataBlockView extends Component<any, any> {

  shouldComponentUpdate(nextProps: Readonly<any>, nextState: Readonly<any>, nextContext: any): boolean {
    let shouldUpdate = true;
    const config1 = nextProps.currentBlock.config;
    const config2 = this.props.currentBlock.config;
    // Check configuration
    if (this.props.width == nextProps.width && this.props.height == nextProps.height) {
      if (_.isEqual(config1, config2)) {
        shouldUpdate = false;
      }
    }

    // Check updated plotData (we need to check this because component render before fetch finish)
    if (this.props.timeseriesData?.length != nextProps.timeseriesData?.length) {
      shouldUpdate = true;
    }

    return shouldUpdate;
  }


  getPlotData = () => {
    let data: PlotDataModel[] = this.props.timeseriesData;
    data = PlotlyUtils.filterByCustomXRange(data, this.props.currentBlock.config.configStyle)
    this.props.checkDeprecatedVersion(data, this.props.currentBlock)
    return data
  }

  /**
   * Preparing the fetched data to adapt plotly data OR antd table
   * @returns
   */
  settingPlotData = (data: PlotDataModel[]) => {
    const { currentBlock } = this.props;
    const configStyle: BlockStyleModel = this.props.currentBlock.config.configStyle;
    const showData: any[] = [];
    let dataWithColor = [];
    let visualizeData: any = [];
    let stacks = [];
    switch (configStyle.graphType) {
      case "table": {
        visualizeData = this.prepareTableData(data);
        break;
      }
      default: {
        if (configStyle.stack && configStyle.stack.isStack && (configStyle.graphType === 'area' || configStyle.graphType === 'bar')) {
          stacks = stackGroups(currentBlock.config.metaData, configStyle.stack.value);
        }
        dataWithColor = this.props.colorizer.colorizeData(data, configStyle.colorscale);
        const indexKeys = PlotlyUtils.getIndexKeys(data)

        dataWithColor?.map((dataElement) => {
          showData.push(this.preparePlotData(dataElement, configStyle, stacks, indexKeys));
        });
        visualizeData = showData;
      }
    }
    if (configStyle.aggregation.isAggregate) {
      const aggLines = this.getAggregationLines(visualizeData, stacks.length);
      if (aggLines.length > 0) {
        visualizeData.push(...aggLines)
      }
    }
    return { data: visualizeData, layout: this.prepareLayout(dataWithColor) }
  }


  prepareTableData = (data: PlotDataModel[]) => {
    const columns: ColumnsType<any> = [
      { title: 'model', dataIndex: 'model' },
      { title: 'scenario', dataIndex: 'scenario' },
      { title: 'variable', dataIndex: 'variable' },
      { title: 'region', dataIndex: 'region' },
    ];

    const values: any[] = [];
    data?.map((dataElement) => {
      const obj = {};
      dataElement.data?.map((e) => {
        obj[e.year] = e.value;
        columns.push({
          title: e.year,
          dataIndex: e.year,
        });
      });

      values.push({
        model: dataElement.model,
        scenario: dataElement.scenario,
        variable: dataElement.variable,
        region: dataElement.region,
        ...obj,
      });
    });

    return { columns, values };
  }

  preparePlotData = (dataElement: PlotDataModel, configStyle: BlockStyleModel, stacks?: undefined[], indexKeys: string[] = []) => {
    let obj;
    const xyDict = this.getXY(dataElement);
    switch (configStyle.graphType) {
      case 'line':
        obj = {
          type: 'scatter',
          mode: "lines+markers",
          x: xyDict.x,
          y: xyDict.y,
          name: PlotlyUtils.getLabel(this.getLegend(dataElement, configStyle.legend, configStyle.showLegend), this.props.width, "legendtext"),
          showlegend: configStyle.showLegend,
          hovertext: this.plotHoverText(dataElement),
          marker: { color: dataElement.color || null }
        };
        break;
      case 'area':
        obj = {
          type: 'scatter',
          fill: 'tonexty',
          fillcolor: dataElement.color ? dataElement.color + "50" : null,
          x: xyDict.x,
          y: xyDict.y,
          mode: "none",
          name: PlotlyUtils.getLabel(this.getLegend(dataElement, configStyle.legend, configStyle.showLegend), this.props.width, "legendtext"),
          showlegend: configStyle.showLegend,
          hovertext: this.plotHoverText(dataElement),
        };
        if (configStyle.stack.isStack && stacks != null) {
          // Add the current element to a stack (if it exist in stagGroups)
          // stack is array contains possible stacks [[{},{}], [{},{}]]
          if (stacks.length == 0) {
            obj.stackgroup = 0;
          } else {
            Object.entries(stacks).forEach(([key, val]: any) => {
              const isExist = val.find(
                raw => dataElement.model == raw["models"] &&
                  dataElement.variable == raw["variables"] &&
                  dataElement.region == raw["regions"] &&
                  dataElement.scenario == raw["scenarios"]
              )
              if (isExist) {
                obj.stackgroup = key;
              }
            })
          }
        }
        break;
      case 'bar':
        obj = {
          type: configStyle.graphType,
          x: xyDict.x,
          y: xyDict.y,
          name: PlotlyUtils.getLabel(this.getLegend(dataElement, configStyle.legend, configStyle.showLegend), this.props.width, "legendtext"),
          showlegend: configStyle.showLegend,
          hovertext: this.plotHoverText(dataElement),
          marker: { color: dataElement.color || null },
        };
        if (configStyle.stack.isStack && stacks != null) {
          // Add the current element to a stack (if it exist in stagGroups)
          // stack is array contains possible stacks [[{},{}], [{},{}]]
          Object.entries(stacks).forEach(([key, val]: any) => {
            const isExist = val.find(
              raw => dataElement.model == raw["models"] &&
                dataElement.variable == raw["variables"] &&
                dataElement.region == raw["regions"] &&
                dataElement.scenario == raw["scenarios"]
            )
            if (isExist) {
              const nonStackIndex = indexKeys.filter(x => x !== configStyle.stack.value.slice(0, -1))
              const groupIndexName = nonStackIndex.map(idx => dataElement[idx]).join(" - ")
              obj.x = [xyDict.x, new Array(xyDict.x.length).fill(groupIndexName)]
              console.log("x(after): ", obj.x);
              obj.stackgroup = key;
            }
          })
        }
        break;
      case "box":
        obj = {
          type: configStyle.graphType,
          y: xyDict.y,
          name: PlotlyUtils.getLabel(this.getLegend(dataElement, configStyle.legend, configStyle.showLegend), this.props.width, "legendtext"),
          showlegend: configStyle.showLegend,
          hoverinfo: "y",
          marker: { color: dataElement.color || null }
        };
        break;
      default:
        obj = {
          type: configStyle.graphType,
          x: xyDict.x,
          y: xyDict.y,
          name: PlotlyUtils.getLabel(this.getLegend(dataElement, configStyle.legend, configStyle.showLegend), this.props.width, "legendtext"),
          showlegend: configStyle.showLegend,
          hovertext: this.plotHoverText(dataElement),
          marker: { color: dataElement.color || null }
        };
    }

    return obj;
  }

  getLegend = (dataElement: PlotDataModel, legend, showLegend) => {
    if (!showLegend) {
      return dataElement.region
        + " - " + dataElement.variable
        + " - " + dataElement.scenario
        + " - " + dataElement.model
        + " - V." + dataElement.run?.version
    } else {
      const label: any[] = [];
      if (legend.Region && dataElement.region) {
        label.push(dataElement.region)
      }
      if (legend.Variable && dataElement.variable) {
        label.push(dataElement.variable)
      }
      if (legend.Scenario && dataElement.scenario) {
        label.push(dataElement.scenario)
      }
      if (legend.Model && dataElement.model) {
        label.push(dataElement.model)
      }
      if (legend.Version && dataElement.run?.version) {
        label.push("V. " + dataElement.run?.version)
      }
      return label.join(' - ')
    }
  }

  plotHoverText = (dataElement: PlotDataModel) => {
    let textHover = '';
    const result: string[] = [];

    dataElement.data?.map((e) => {
      textHover =
        dataElement.model +
        '/' +
        dataElement.scenario +
        '<br>' +
        'region:' +
        dataElement.region +
        '<br>' +
        'variable: ' +
        dataElement.variable;
      result.push(textHover);
    });

    return result;
  };

  /**
   * Extract the x and y axis from data
   * @param dataElement The retrieved data (from API)
   * @returns {x: x_array, y: y_array}
   */
  getXY = (dataElement: PlotDataModel) => {
    const x: any[] = [];
    const y: any[] = []
    dataElement.data?.map((d) => {
      if (d.value !== "") {
        x.push(d.year)
        y.push(d.value)
      }
    });
    return { x, y };
  };

  prepareLayout = (data) => {
    const configStyle: BlockStyleModel = this.props.currentBlock.config.configStyle;

    const layout: any = {
      YAxis: {
        title: {
          text: PlotlyUtils.getLabel(this.getYAxisLabel(data), this.props.height, "ytitle"),
        },
        rangemode: configStyle.YAxis.force0 ? "tozero" : "normal",
        automargin: true,
        dragmode: "zoom",
        mapbox: { style: "carto-positron", center: { lat: 38, lon: -90 }, zoom: 3 },
        margin: { r: 0, t: 0, b: 0, l: 0 },
        width: this.props.width,
        height: this.props.height,
      },
    }

    return layout
  }

  getAggregationLines = (data, numberOfStacks) => {
    const configStyle: BlockStyleModel = this.props.currentBlock.config.configStyle;
    let x: any = [];
    const y: any = [];
    let x1: any = [];
    let groups = null;
    const graphs = ["line", "area", "bar"]; // TODO add box
    if (graphs.includes(configStyle.graphType)) {
      if (!configStyle.stack.isStack || numberOfStacks == 0) {
        data.forEach(graphelement => {
          x.push(...graphelement.x);
          y.push(...graphelement.y);
        });
        groups = x;
      } else { // is stack
        // Sum each stack
        const stackGroup = {};
        let stackGroupSySum: any[] = [];
        // Sum each groups
        for (let i = 0; i < numberOfStacks; i++) {
          data.forEach(dataElement => {
            if (dataElement.stackgroup == i) {
              let x = dataElement.x;
              if (dataElement.x[0].length > 1) {
                x = dataElement.x[0];
                x1 = [...x1, ...dataElement.x[1]];
              }
              const result = x.map((value, index) => {
                return { x: value, y: dataElement.y[index] };
              });
              (stackGroup[i] = stackGroup[i] || []).push(...result)
            }
          });
          stackGroupSySum = Object.values(stackGroup).map(element => PlotlyUtils.groupByYear(element));
        }

        switch (configStyle.graphType) {

          case "line": // no stacking for lines
            data.forEach(graphelement => {
              x.push(...graphelement.x);
              y.push(...graphelement.y);
            });
            groups = x;
            break;
          case 'area':
            stackGroupSySum.forEach(element => {
              x.push(...Object.keys(element).map(Number));
              y.push(...Object.values(element));
            })
            groups = x;
            break;
          case 'bar':
            stackGroupSySum.forEach(element => {
              x.push(...Object.keys(element).map(Number));
              y.push(...Object.values(element));
            })
            groups = x;
            x = [x, new Array(x.length).fill(configStyle.aggregation.type)];
            break;
        }
      }
      return [{
        type: 'scatter',
        mode: 'lines+markers',
        x: x,
        y: y,
        hoverText: configStyle.aggregation.type,
        name: configStyle.aggregation.label,
        transforms: [{
          type: 'aggregate',
          groups: groups,
          aggregations: [
            { target: 'y', func: configStyle.aggregation.type, enabled: true },
          ]
        }],
        showlegend: configStyle.showLegend,
        marker: { color: "black" }
      }];
    }
    return []

  }

  getYAxisLabel = (data: PlotDataModel[]) => {
    const configStyle: BlockStyleModel = this.props.currentBlock.config.configStyle;

    const labels = {}
    for (const dataElement of data) {
      labels[dataElement.variable] = dataElement.unit
    }
    const label: any[] = []
    for (const key of Object.keys(labels)) {
      let text;
      if (configStyle.YAxis.unit && configStyle.YAxis.label) {
        text = key + "<br>" + labels[key]
      } else if (configStyle.YAxis.unit) {
        text = labels[key]
      } else if (configStyle.YAxis.label) {
        text = key
      }
      if (text) {
        label.push(text)
      }
    }
    if (label.length > 0) {
      const uniqueItems = [...new Set(label)]
      return uniqueItems.join("<br>")
    } else {
      return undefined;
    }
  }

  render() {
    const rawData = this.getPlotData()
    const { data, layout } = this.settingPlotData(rawData);
    switch (this.props.currentBlock.config.configStyle.graphType) {
      case "pie": {
        return <PieView
          rawData={rawData}
          currentBlock={this.props.currentBlock}
          width={this.props.width}
          height={this.props.height}
        />
      }
      case "map": {
        return <MapBlock {...this.props} data={data} layout={layout} />
      }
      default: {
        return <PlotlyGraph {...this.props} data={data} layout={layout} />;
      }
    }
  }
}

export default withColorizer(DataBlockView)
