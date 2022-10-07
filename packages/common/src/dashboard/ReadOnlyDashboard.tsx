import { Spin } from 'antd';
import { cp } from 'fs/promises';
import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ComponentPropsWithDataManager from '../datamanager/ComponentPropsWithDataManager';
import BlockModel from '../models/BlockModel';
import ConfigurationModel from '../models/ConfigurationModel';
import DashboardModel from '../models/DashboardModel';
import DataModel from '../models/DataModel';
import DashboardConfigView from './DashboardConfigView';

interface ReadOnlyDashboardProps extends ComponentPropsWithDataManager {
  getData: (data: DataModel[]) => any[];
  setEnableSwitchEmbeddedMode: (enable: boolean) => void;
  isEmbedded?: boolean;
  setDashboardModelScenario: (selection) => void;
}

type LocationState = { dashboard: DashboardModel };

const ReadOnlyDashboard: React.FC<ReadOnlyDashboardProps> = (
  props: ReadOnlyDashboardProps
) => {
  const [dashboard, setDashboard] = useState<DashboardModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blockSelectedId, setBlockSelectedId] = useState('');
  const location = useLocation();
  const [searchParams] = useSearchParams();

  /**
   * Update configuration metaData (selected models and scenarios)
   * @param data Block config metaData
   * @param idBlock In case of controling dataBlocks by controlBlock (so the control block is not necessarily selected, we need mandatory the id of controlBlock)
   */
  const updateBlockMetaData = (data, idBlock = '') => {

    if (!!dashboard) {
      // store the selected data
      let f_dashboard: DashboardModel = dashboard
      let f_blockSelectedId: string;
      if (blockSelectedId === '') {
        f_blockSelectedId = idBlock;
      } else {
        f_blockSelectedId = blockSelectedId;
      }

      let selectedBlock = f_dashboard.blocks[f_blockSelectedId];
      if (selectedBlock.blockType !== 'text') {
        let config = selectedBlock.config as ConfigurationModel
        let metaData = config.metaData;
        metaData = { ...metaData, ...data };
        config.metaData = metaData;
      } else {
        selectedBlock.config = { value: data };
      }
      setDashboard({ ...dashboard, blocks: f_dashboard.blocks });
    }
  };


  useEffect(() => {
    const locationState = location.state as LocationState;
    if (locationState?.dashboard) {
      setDashboard(locationState.dashboard);
      props.setDashboardModelScenario(locationState.dashboard.dataStructure);
    } else {
      const id = searchParams.get('id') as string;
      const fetchDashboard = async (id: string) => {
        await props.dataManager.getDashboard(id).then((dashboard) => {
          setDashboard(dashboard);
          props.setDashboardModelScenario(dashboard.dataStructure);
        });
      };
      fetchDashboard(id);
    }
    setIsLoading(false);
    props.setEnableSwitchEmbeddedMode(true);
    return () => {
      props.setEnableSwitchEmbeddedMode(false);
    };
  }, []);

  return (
    <div
      className="dashboard"
      style={{ height: props.isEmbedded ? '100%' : undefined }}
    >
      <div className="dashboard-content">
        {(isLoading || !dashboard) && <Spin />}
        {dashboard && (
          <DashboardConfigView
            dashboard={dashboard}
            layout={dashboard.layout}
            blocks={dashboard.blocks}
            getData={props.getData}
            updateSelectedBlock={(blockSelectedId: string) => { }}
            blockSelectedId={undefined}
            updateBlockMetaData={updateBlockMetaData}
            updateBlockStyleConfig={(data) => { }}
            updateDashboardMetadata={(data) => { }}
            readonly
          />
        )}
      </div>
    </div>
  );
};

export default ReadOnlyDashboard;
