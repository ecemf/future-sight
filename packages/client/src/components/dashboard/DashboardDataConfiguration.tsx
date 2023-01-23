import {
  BlockDataModel,
  BlockModel, ColorizerProvider,
  ComponentPropsWithDataManager,
  ConfigurationModel, DataModel,
  getBlock,
  ReadOnlyDashboard, Colorizer
} from '@future-sight/common';
import { Component } from 'react';
import withDataManager from '../../services/withDataManager';
import { RoutingProps } from '../app/Routing';
import DashboardSelectionControl from './DashboardSelectionControl';
import { getDraft, removeDraft } from '../drafts/DraftUtils';
import Utils from '../../services/Utils';
import { Spin } from 'antd';

export interface DashboardDataConfigurationProps
  extends ComponentPropsWithDataManager,
  RoutingProps {
  readonly?: boolean;
}

const dataFilterKeys = ["model", "scenario", "variable", "region"]

/**
 * To dispatch the data to all blocks of dashboard
 */
class DashboardDataConfiguration extends Component<
  DashboardDataConfigurationProps,
  any
> {
  optionsLabel: string[] = [];
  constructor(props) {
    super(props);
    this.optionsLabel = this.props.dataManager.getOptions();
    this.state = {
      filters: {
        regions: {},
        variables: {},
        scenarios: {},
        models: {},
      },
      filtreByDataFocus: {
        regions: [],
        variables: [],
        scenarios: [],
        models: [],
      },
      /**
       * Data (with timeseries from IASA API)
       */
      plotData: [],
      isFetchData: false,
      firstFilterRaws: []
    };
  }

  async componentDidMount() {
    const filters = this.state.filters;
    try {
      filters['regions'] = await this.props.dataManager.fetchRegions();
      filters['variables'] = await this.props.dataManager.fetchVariables();
      filters['models'] = await this.props.dataManager.fetchModels();
      filters['scenarios'] = await this.props.dataManager.fetchScenarios();
      this.setState({ filters, isFetchData: true });
    } catch (error) {
      console.log("ERROR FETCH: ", error);
    }
  }

  saveData = async (id: string, image?: string) => {
    const data = getDraft(id);
    if (data) {
      if (image) {
        data.preview = image;
      }
      try {
        const res = await this.props.dataManager.saveDashboard(data);
        removeDraft(id);
        return res.id;
      } catch (e) {
        console.error(e);
      }
    }
  };

  /**
   * to dispatch data for diffrenet plots (based on block id)
   * @param block the block
   * @returns the fetched data from API with timeseries
   */
  blockData = (block: BlockModel) => {

    if (block.blockType !== "text") {
      const config: ConfigurationModel | any = block.config;
      const metaData: BlockDataModel = config.metaData;
      const data: any[] = [];
      const missingData: any[] = [];

      if (
        metaData.models &&
        metaData.scenarios &&
        metaData.variables &&
        metaData.regions
      ) {
        metaData.models.forEach((model) => {
          metaData.scenarios.forEach((scenario) => {
            metaData.variables.forEach((variable) => {
              metaData.regions.forEach((region) => {
                const d = this.state.plotData.find(
                  (e) =>
                    e.model === model &&
                    e.scenario === scenario &&
                    e.variable === variable &&
                    e.region === region
                );
                if (d) {
                  data.push(d);
                } else {
                  missingData.push({ model, scenario, variable, region });
                }
              });
            });
          });
        });
      }

      if (missingData.length > 0) {
        this.retreiveAllTimeSeriesData(missingData);
      }
      return data;
    }

    return [];
  };

  /**
   * If dashboard is draft, get first all the possible data to visualize
   * This function called one time on draft dashboard rendered
   */
  getPlotData = (blocks: BlockModel[]) => {
    const data: any[] = [];
    Object.values(blocks).forEach((block: any) => {
      const metaData: BlockDataModel = { ...block.config.metaData };

      // get all possible data from controlled blocks
      const controlBlock = getBlock(blocks, block.controlBlock);
      if (controlBlock.id !== '') {
        const config = controlBlock.config as ConfigurationModel;
        this.optionsLabel.forEach(option => {
          if (config.metaData.master[option].isMaster) {
            metaData[option] = config.metaData[option];
          }
        })
      }

      // Check if the block type != text
      if (
        metaData !== undefined &&
        metaData.models &&
        metaData.scenarios &&
        metaData.variables &&
        metaData.regions
      ) {
        metaData.models.forEach((model) => {
          metaData.scenarios.forEach((scenario) => {
            metaData.variables.forEach((variable) => {
              metaData.regions.forEach((region) => {
                data.push({ model, scenario, variable, region });
              });
            });
          });
        });
      }
    });
    this.retreiveAllTimeSeriesData(data);
  };

  retreiveAllTimeSeriesData = (data: DataModel[]) => {
    this.props.dataManager.fetchPlotData(data)
      .then(res => {
        console.log("no data for", data);
        if (res.length > 0) {
          this.setState({ plotData: [...this.state.plotData, ...res] });
        }
      }
      );
  }

  /**
   * Set the first filtered data (By data focus)
   * @param dashboard the current dashboard
   * @param selectedFilter dashboard selected filter
   */
  updateFilterByDataFocus = (dashboard, selectedFilter) => {
    if (this.state.isFetchData){
        const data = {...this.state.filtreByDataFocus}

        if (selectedFilter === "" || dashboard.dataStructure[selectedFilter].selection === []){
          for (const [key, valueDict] of Object.entries(this.state.filters)){
            data[key]=Object.keys(valueDict as {string: unknown})
          }
        }

        else if (selectedFilter !== '') {
          data[selectedFilter] = dashboard.dataStructure[selectedFilter].selection;
          this.optionsLabel.forEach((option) => {
            if (option !== selectedFilter) {
              data[selectedFilter].forEach((filterValue) => {
                data[option] = Array.from(
                  new Set([
                    ...data[option],
                    ...this.state.filters[selectedFilter][filterValue][option],
                  ])
                );
              });
            }
          });
        }

        this.setState({ filtreByDataFocus: data });
        const filters = {};
        filters[selectedFilter] = data[selectedFilter];
        this.props.dataManager.fetchRaws({ filters }).then(res => {
        this.setState({ firstFilterRaws: res })
        });
    }
  }

  render() {
    const { readonly } = this.props;

    const toRender = (readonly ? (
      <ReadOnlyDashboard
        shareButtonOnClickHandler={() => Utils.copyToClipboard()}
        embedButtonOnClickHandler={() => Utils.copyToClipboard(undefined, "&embedded")}
        blockData={this.blockData}
        optionsLabel={this.optionsLabel}
        {...this.props}
      />
    ) : (
      (this.state.isFetchData && <DashboardSelectionControl
        saveData={this.saveData}
        filters={this.state.filters}
        plotData={this.state.plotData}
        blockData={this.blockData}
        getPlotData={this.getPlotData}
        updateFilterByDataFocus={this.updateFilterByDataFocus}
        filtreByDataFocus={this.state.filtreByDataFocus}
        optionsLabel={this.optionsLabel}
        {...this.props}
        firstFilterRaws={this.state.firstFilterRaws}
      />) || <div className="dashboard">
        <Spin className="centered" />
      </div>)
        // TODO handle error
    )

    return (
        <ColorizerProvider colorizer={new Colorizer(dataFilterKeys, undefined, undefined, "region")}>
          {toRender}
        </ColorizerProvider>
    )
  }
}

export default withDataManager(DashboardDataConfiguration);
