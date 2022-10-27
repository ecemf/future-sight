import React, { Component } from 'react';
import { Button, Col, Row, Select } from 'antd';
import AnalysisDataTable from './AnalysisDataTable';

const { Option } = Select;

/**
 * Make the user selected all metaData of models and scenarios
 */
class DataStructureForm extends Component<any, any> {
  data = {};

  constructor(props) {
    super(props);
    this.state = {
      scenarios: [],
      models: [],

      /**
       * The data selected in dropdownn list
       */
      selectedModel: null,
      selectedScenarios: [],

      /**
       * The data to send to dashboard
       */
      data: [],
    };
  }

  componentDidMount() {
    this.props.dataManager.fetchModels().then((data) => {
      this.setState({ models: data });
    });

    this.setState({ data: { ...this.props.dashboard.dataStructure } });
  }

  /*
  * Return false if key already selected in datastructure
  * */
  filterAlreadySelectedScenarios = (key: string, modelSelected: string) => {
    if (modelSelected in this.state.data){
      if (key in this.state.data[modelSelected]){
        return false
      }
    }
    return true
  }

  /**
   * Triggered when the list of selection models changed
   * to update the list of scenarios
   */
  modelSelectionChange = (modelSelected: string) => {
    // Change scenarios on dropdown list
    const scenarios = Object.keys(this.state.models[modelSelected])
    const selectedScenarios = modelSelected in this.state.data
        ? Object.keys(this.state.data[modelSelected])
        : []
    this.setState({
      scenarios,
      selectedScenarios,
      selectedModel: modelSelected,
    });
  };

  scenariosSelectionChange = (selectedScenarios: string[]) => {
    this.setState({ selectedScenarios });
  };

  /**
   * To show the selected data in table
   */
  addDataToTable = () => {
    if (
      this.state.selectedModel != '' &&
      this.state.selectedScenarios.length > 0
    ) {
      const model = this.state.selectedModel;
      const temp_data = {...this.state.data, [model]:{}};
      this.state.selectedScenarios.map((scenario) => {
        // to set variables and regions
        temp_data[model][scenario] = this.state.models[model][scenario];
      });
      this.setState({data: temp_data})
      this.props.handleStructureData(temp_data);
      this.resetForm();
    }
  };

  deleteRow = (record) => {
    const data = this.state.data;
    delete data[record.model]
    this.props.handleStructureData(data, record);
    this.resetForm();
    //add block suppression popup
  }

  /**
   * Reset the drop down lists
   */
  resetForm = () => {
    this.setState({
      selectedScenarios: [],
      selectedModel: null,
      scenarios: [],
    });
  };

  render() {
    return (
      <div>
        <Row justify="space-evenly">
          <Col xs={20} sm={20} md={6} lg={7}>
            <Select
              className="width-100"
              placeholder="Please select the model"
              value={this.state.selectedModel}
              onChange={this.modelSelectionChange}
            >
              {Object.keys(this.state.models).map((model) => (
                <Option key={model} value={model}>
                  {model}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={20} sm={20} md={6} lg={7}>
            <Select
              mode="multiple"
              className="width-100"
              placeholder="Scenarios"
              onChange={this.scenariosSelectionChange}
              value={this.state.selectedScenarios}
            >
              {this.state.scenarios.map((scenario) => (
                <Option key={scenario} value={scenario}>
                  {scenario}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
        <Row justify="center" className="p-20">
          <Button type="primary" onClick={this.addDataToTable}>
            Add as analysis data
          </Button>
        </Row>
        <Row justify="center">
          <AnalysisDataTable
            dataStructure={this.props.dashboard.dataStructure}
            deleteRow={this.deleteRow}
          />
        </Row>
      </div>
    );
  }
}

export default DataStructureForm;
