import { Spin } from 'antd';
import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ComponentPropsWithDataManager from '../datamanager/ComponentPropsWithDataManager';
import ConfigurationModel from '../models/ConfigurationModel';
import DashboardModel from '../models/DashboardModel';
import DataModel from '../models/DataModel';
import LayoutModel from '../models/LayoutModel';
import DashboardConfigView from './DashboardConfigView';

interface ReadOnlyDashboardProps extends ComponentPropsWithDataManager {
  getData: (data: DataModel[]) => any[];
  setEnableSwitchEmbeddedMode: (enable: boolean) => void;
  isEmbedded?: boolean;
}

type LocationState = { dashboard: DashboardModel };

const ReadOnlyDashboard: React.FC<ReadOnlyDashboardProps> = ({
  getData,
  dataManager,
  setEnableSwitchEmbeddedMode,
  isEmbedded,
}) => {
  const [dashboard, setDashboard] = useState<DashboardModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blockSelectedId, setBlockSelectedId] = useState('');
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const locationState = location.state as LocationState;
    if (locationState?.dashboard) {
      setDashboard(locationState.dashboard);
    } else {
      const id = searchParams.get('id') as string;
      const fetchDashboard = async (id: string) => {
        await dataManager.getDashboard(id).then(setDashboard);
      };
      fetchDashboard(id);
    }
    setIsLoading(false);
    setEnableSwitchEmbeddedMode(true);
    return () => {
      setEnableSwitchEmbeddedMode(false);
    };
  }, []);

  return (
    <div
      className="dashboard"
      style={{ height: isEmbedded ? '100%' : undefined }}
    >
      <div className="dashboard-content">
        {(isLoading || !dashboard) && <Spin />}
        {dashboard && (
          <DashboardConfigView
            dashboard={dashboard}
            layout={dashboard.layout}
            blocks={dashboard.blocks}
            getData={getData}
            updateLayout={(layout: LayoutModel[]) => {
              setDashboard({ ...dashboard, layout: layout });
            }}
            updateSelectedBlock={(blockSelectedId: string) => {
              setBlockSelectedId(blockSelectedId);
            }}
            blockSelectedId={blockSelectedId}
            updateBlockMetaData={(data, idBlock) => {
              if (blockSelectedId === '') {
                setBlockSelectedId(idBlock);
              }
              const config = dashboard.blocks[blockSelectedId]
                .config as ConfigurationModel;
              let metaData = config.metaData;
              metaData = { ...metaData, ...data };
              config.metaData = metaData;
              setDashboard({ ...dashboard, blocks: dashboard.blocks });
            }}
            updateBlockStyleConfig={(data) => {
              (
                dashboard.blocks[blockSelectedId].config as ConfigurationModel
              ).configStyle = data;
              setDashboard({ ...dashboard, blocks: dashboard.blocks });
            }}
            updateDashboardMetadata={(data) =>
              setDashboard({ ...dashboard, ...data })
            }
          />
        )}
      </div>
    </div>
  );
};

export default ReadOnlyDashboard;