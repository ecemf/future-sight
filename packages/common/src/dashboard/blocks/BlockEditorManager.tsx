import React, { Component } from 'react';
import { Button, Col, Popconfirm, Row, Tooltip, Tabs } from 'antd';
import DataBlockEditor from './data/DataBlockEditor';
import DataBlockVisualizationEditor from './data/DataBlockVisualizationEditor';
import TextBlockEditor from './text/TextBlockEditor';
import ControlBlockEditor from './control/ControlBlockEditor';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import ControlBlockVisualizationEditor from "./control/ControlBlockVisualizationEditor";

const { TabPane } = Tabs;

/**
 * Render the view edit block according the the selected type
 */
export default class BlockEditorManager extends Component<any, any> {
  blockType;
  readonly tabsTypes = [
    { title: 'Data', icon: <EditOutlined />, type: 'data' },
    { title: 'Visualization', icon: <EyeOutlined />, type: 'style' },
  ];

  constructor(props) {
    super(props);
    this.state = {
      tab: 'data',
    };
  }

  hasTabs = (type) => {
    return type === "data" || type === "control"
  }

  blockByType = () => {
    const currentBlock = this.props.blocks[this.props.blockSelectedId];
    switch (currentBlock.blockType) {
      case 'data':
        if (this.state.tab === 'data') {
          return (<DataBlockEditor {...this.props} currentBlock={currentBlock}/>);
        }
        else {
          return (
              <DataBlockVisualizationEditor{...this.props} currentBlock={currentBlock}/>
          );
        }
      case 'text':
        return <TextBlockEditor {...this.props} currentBlock={currentBlock} />;
      case 'control':
        if (this.state.tab === 'data') {
          return (<ControlBlockEditor {...this.props} currentBlock={currentBlock}/>);
        } else {
          return (
              <ControlBlockVisualizationEditor {...this.props} currentBlock={currentBlock}/>
          )
        }
      default:
        return <p>Error !</p>;
    }
  };

  tabsToggle = (tabType) => {
    this.setState({ tab: tabType });
  };

  render() {
    return (
      <>
        <Row
          justify={
            this.hasTabs(this.props.blocks[this.props.blockSelectedId].blockType)
              ? 'space-between'
              : 'end'
          }
        >
          {this.hasTabs(this.props.blocks[this.props.blockSelectedId].blockType) && (
            <Col span={22}>
              <Tabs type="card" onChange={(activeKey) => this.tabsToggle(activeKey)}>
                {this.tabsTypes.map((tab) => {
                  return (
                    <TabPane key={tab.type} tab={
                        <span>
                          {tab.icon}
                          {tab.title}
                        </span>
                      }
                    />
                  );
                })}
              </Tabs>
            </Col>
          )}
          <Col span={2}>
            <Popconfirm
              title="Are you sure you want to delete this block ?"
              onConfirm={() => this.props.deleteBlock(this.props.blockSelectedId)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete block">
                <Button type="default" icon={<DeleteOutlined />} danger size="large" />
              </Tooltip>
            </Popconfirm>
          </Col>
        </Row>

        <div className="width-100">
          {this.blockByType()}
        </div>
      </>
    );
  }
}
