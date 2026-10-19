import type { FC } from 'react';

import { ParameterizationHubPage } from './adapter/in/pages/ParameterizationHubPage.js';
import type { ReferenceDataMfeProps } from './contracts/remote-props.js';

const ParameterizationHub: FC<ReferenceDataMfeProps> = ({ permissions = [] }) => (
  <ParameterizationHubPage permissions={permissions} />
);

export default ParameterizationHub;
