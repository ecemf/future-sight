import React, { Component } from 'react';
import DataBlockView from "./DataBlockView";
import LoaderMask from "../utils/LoaderMask";

class DataBlockTransfert extends Component<any, any> {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      firstLoad: true
    }
  }

  componentDidMount() {
    this.retrieveData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (JSON.stringify(this.props.getMetaData(this.props.currentBlock)) !== JSON.stringify(this.props.getMetaData(prevProps.currentBlock))) {
      if (this.props.parentBlock != null) {
        if (JSON.stringify(this.props.getMetaData(this.props.parentBlock)) === JSON.stringify(this.props.getMetaData(prevProps.parentBlock))) {
          this.retrieveData(); // When dataBlock update its data (No controlled filteres)
        }
      } else {
        this.retrieveData();
      }
    }
  }

  retrieveData = () => {
    this.setState({ loading: true }, () => {
      this.props.blockData(this.props.currentBlock).then(() => {
        this.setState({ loading: false, firstLoad: false });
      })
    })
  }

  render() {
    let timeseriesData = this.props.plotData[this.props.currentBlock.id]
    if (!timeseriesData) {
      timeseriesData = []
    }

    return <>
      <LoaderMask loading={this.state.firstLoad ? this.state.loading : (this.props.loadingControlBlock != null ? this.props.loadingControlBlock : this.state.loading)} />
      <DataBlockView
        currentBlock={this.props.currentBlock}
        timeseriesData={timeseriesData}
        width={this.props.width}
        height={this.props.height}
        checkDeprecatedVersion={this.props.checkDeprecatedVersion}
      />
    </>
  }
}

export default DataBlockTransfert
