import React, { Component } from 'react'
import DashboardConfigView from './DashboardConfigView';
import DashboardConfigControl from './DashboardConfigControl';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LeftCircleFilled
} from '@ant-design/icons';
import { Button, Drawer, Space } from 'antd';

export default class Dashboard extends Component<any, any> {

  constructor(props) {
    super(props);
    this.state = {
      collapsed: false,
      placement: 'right',
      layouts: {
        lg: [],
        md: [],
        sm: [],
        xs: [],
        xxs: [],
      },
      data: {}
    }
  }

  componentDidMount() {
    window.scrollTo(0, 0)
  }

  buildLayouts = (layouts, data) => {

    const newLayouts = {...this.state.layouts};
    Object.keys(this.state.layouts).map(key => {
      newLayouts[key] = [...newLayouts[key], ...layouts[key]];
    });

    const newData = this.state.data;
    Object.keys(data).map(key => {
      newData[key] = data[key];
    })


    this.setState({ layouts: newLayouts, data: newData });
  }

  render() {
    const setVisibility = () => {
      this.setState({
        collapsed: !this.state.collapsed
      })
    }

    const setPlacement = (e) => {
      this.setState({ placement: e.currentTarget.value })
    }

    return (
      <div className='dashboard'>
        <Drawer
          placement={this.state.placement}
          width={500}
          visible={this.state.collapsed}
          onClose={setVisibility}
          maskClosable={true}
          mask={true}
          className={"drawer"}
          style={!this.state.collapsed ? { zIndex: '-1' } : { zIndex: '999' }}
          extra={
            <Space>
              <Button onClick={() => this.props.submitEvent(false)}>
                <LeftCircleFilled />
              </Button>
              <Button onClick={setPlacement} value="left">left</Button>
              <Button onClick={setPlacement} value="right">right</Button>
            </Space>
          }
        >
          <DashboardConfigControl {...this.props} buildLayouts={this.buildLayouts} />
        </Drawer>
        <div className="dashboard-content">
          <div>
            {React.createElement(this.state.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setVisibility(),
            })}
          </div>
          <DashboardConfigView data={this.state.data} layouts={this.state.layouts} />
        </div>
      </div>
    )
  }
}