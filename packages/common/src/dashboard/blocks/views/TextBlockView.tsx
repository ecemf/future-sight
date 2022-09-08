import React from 'react';
import MDEditor from '@uiw/react-md-editor';

interface TextBlockViewProps {
  currentBlock: any;
}


export default class TextBlockView extends React.Component<any, any> {
  render() {
    return <MDEditor.Markdown source={this.props.currentBlock.config.value} />;
  }
}
