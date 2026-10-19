import { useRef, useState, type FC } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';

import { useDepartments } from './application/useDepartments.js';
import { useMacroregions } from './application/useMacroregions.js';
import { useMicroregions } from './application/useMicroregions.js';
import { useMunicipalities } from './application/useMunicipalities.js';
import type { ReferenceDataMfeProps } from './contracts/remote-props.js';
import type { GeographyLevel, GeographyOptions, GeographyRecordView } from './adapter/in/components/GeographyHierarchy.js';
import { GeographyHierarchy } from './adapter/in/components/GeographyHierarchy.js';
import type { GeographyFormValues } from './adapter/in/components/GeographyHierarchy.js';
import type { DepartmentDto, MacroregionDto, MicroregionDto, MunicipalityDto } from './domain/geography.js';
import { InstitutionalStructure } from './adapter/in/components/InstitutionalStructure.js';
import {
  REF_CATALOG_MANAGE,
  REF_CATALOG_VIEW,
  REF_HIERARCHY_MANAGE,
  REF_PARAMETER_MANAGE,
  REF_PARAMETER_VIEW,
} from './contracts/remote-props.js';
import styles from './App.module.css';
import { Parameterization } from './adapter/in/components/Parameterization.js';

const toMacroregionView = (item: MacroregionDto, isDemo = false): GeographyRecordView => ({
  id: item.id,
  name: item.name,
  code: item.code,
  isActive: item.is_active,
  ...(isDemo ? { isDemo: true } : {}),
});

const toMicroregionView = (item: MicroregionDto, isDemo = false): GeographyRecordView => ({
  id: item.id,
  name: item.name,
  code: item.code,
  parentId: item.macroregion_id,
  isActive: item.is_active,
  ...(isDemo ? { isDemo: true } : {}),
});

const toDepartmentView = (item: DepartmentDto, isDemo = false): GeographyRecordView => ({
  id: item.id,
  name: item.name,
  daneCode: item.dane_code,
  parentId: item.microregion_id,
  isActive: item.is_active,
  ...(isDemo ? { isDemo: true } : {}),
});

const toMunicipalityView = (item: MunicipalityDto, isDemo = false): GeographyRecordView => ({
  id: item.id,
  name: item.name,
  daneCode: item.dane_code,
  parentId: item.department_id,
  isActive: item.is_active,
  ...(isDemo ? { isDemo: true } : {}),
});

const toPageView = (page?: { page: number; page_size: number; total_items: number; total_pages: number }) =>
  page ? { page: page.page, pageSize: page.page_size, totalItems: page.total_items, totalPages: page.total_pages } : undefined;

type SelectionIds = Partial<Record<GeographyLevel, string>>;
type DemoCollections = {
  macroregion: MacroregionDto[];
  microregion: MicroregionDto[];
  department: DepartmentDto[];
  municipality: MunicipalityDto[];
};

const emptyDemoCollections = (): DemoCollections => ({
  macroregion: [], microregion: [], department: [], municipality: [],
});

const makeLocalPage = <T,>(items: T[], page: number, pageSize: number) => {
  const totalPages = Math.ceil(items.length / pageSize);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, page_size: pageSize, total_items: items.length, total_pages: totalPages },
  };
};

const API_SETUP_MESSAGE =
  'Falta configurar VITE_REFERENCE_DATA_API_BASE_URL con la URL base de Reference Data, incluido /api/v1.';

function ParameterizationBackLink() {
  const isInsideRouter = useInRouterContext();
  const content = <><span aria-hidden="true">← </span>Parametrización</>;

  return isInsideRouter ? (
    <Link className={styles.backLabel} to="/admin/parametrizacion">{content}</Link>
  ) : (
    <a className={styles.backLabel} href="/admin/parametrizacion">{content}</a>
  );
}

const App: FC<ReferenceDataMfeProps> = ({ permissions = [] }) => {
  const canManageHierarchy = permissions.includes(REF_HIERARCHY_MANAGE);
  const apiBaseUrl = import.meta.env.VITE_REFERENCE_DATA_API_BASE_URL?.trim();
  const demoMode = import.meta.env.DEV && !apiBaseUrl;
  const [activeSection, setActiveSection] = useState<'geography' | 'institutional' | 'parameterization'>('geography');
  const canViewCatalogs = permissions.includes(REF_CATALOG_VIEW);
  const canManageCatalogs = permissions.includes(REF_CATALOG_MANAGE);
  const canViewParameters = permissions.includes(REF_PARAMETER_VIEW);
  const canManageParameters = permissions.includes(REF_PARAMETER_MANAGE);
  const [selection, setSelection] = useState<SelectionIds>({});
  const [demoRecords, setDemoRecords] = useState<DemoCollections>(emptyDemoCollections);
  const demoId = useRef(0);
  const [demoMessage, setDemoMessage] = useState('');
  const macroregions = useMacroregions(apiBaseUrl);
  const microregions = useMicroregions(apiBaseUrl, selection.macroregion);
  const departments = useDepartments(apiBaseUrl, selection.microregion);
  const municipalities = useMunicipalities(apiBaseUrl, selection.department);

  const demoMacro = demoRecords.macroregion;
  const demoMicro = demoRecords.microregion.filter((item) => item.macroregion_id === selection.macroregion);
  const demoDepartment = demoRecords.department.filter((item) => item.microregion_id === selection.microregion);
  const demoMunicipality = demoRecords.municipality.filter((item) => item.department_id === selection.department);
  const demoMacroPage = makeLocalPage(demoMacro, macroregions.page, macroregions.pageSize);
  const demoMicroPage = makeLocalPage(demoMicro, microregions.page, microregions.pageSize);
  const demoDepartmentPage = makeLocalPage(demoDepartment, departments.page, departments.pageSize);
  const demoMunicipalityPage = makeLocalPage(demoMunicipality, municipalities.page, municipalities.pageSize);
  const options: GeographyOptions = demoMode ? {
    macroregion: demoMacroPage.items.map((item) => toMacroregionView(item, true)),
    microregion: demoMicroPage.items.map((item) => toMicroregionView(item, true)),
    department: demoDepartmentPage.items.map((item) => toDepartmentView(item, true)),
    municipality: demoMunicipalityPage.items.map((item) => toMunicipalityView(item, true)),
  } : {
    macroregion: macroregions.items.map((item) => toMacroregionView(item)),
    microregion: microregions.items.map((item) => toMicroregionView(item)),
    department: departments.items.map((item) => toDepartmentView(item)),
    municipality: municipalities.items.map((item) => toMunicipalityView(item)),
  };
  const parentOptions: GeographyOptions = demoMode ? {
    macroregion: demoRecords.macroregion.map((item) => toMacroregionView(item, true)),
    microregion: demoRecords.microregion.map((item) => toMicroregionView(item, true)),
    department: demoRecords.department.map((item) => toDepartmentView(item, true)),
    municipality: demoRecords.municipality.map((item) => toMunicipalityView(item, true)),
  } : options;
  const pagination = demoMode ? {
    macroregion: toPageView(demoMacroPage.pagination)!,
    microregion: toPageView(demoMicroPage.pagination)!,
    department: toPageView(demoDepartmentPage.pagination)!,
    municipality: toPageView(demoMunicipalityPage.pagination)!,
  } : {
    ...(toPageView(macroregions.pagination) ? { macroregion: toPageView(macroregions.pagination)! } : {}),
    ...(toPageView(microregions.pagination) ? { microregion: toPageView(microregions.pagination)! } : {}),
    ...(toPageView(departments.pagination) ? { department: toPageView(departments.pagination)! } : {}),
    ...(toPageView(municipalities.pagination) ? { municipality: toPageView(municipalities.pagination)! } : {}),
  };
  const errors = {
    ...(macroregions.error ? { macroregion: macroregions.error.message } : {}),
    ...(microregions.error ? { microregion: microregions.error.message } : {}),
    ...(departments.error ? { department: departments.error.message } : {}),
    ...(municipalities.error ? { municipality: municipalities.error.message } : {}),
  };
  const loadingLevel = macroregions.loading
    ? 'macroregion'
    : microregions.loading
      ? 'microregion'
      : departments.loading
        ? 'department'
        : municipalities.loading
          ? 'municipality'
          : undefined;
  const parentLoading = {
    macroregion: macroregions.loading,
    microregion: microregions.loading,
    department: departments.loading,
    municipality: municipalities.loading,
  };
  const parentErrors = {
    ...(macroregions.error ? { macroregion: macroregions.error.message } : {}),
    ...(microregions.error ? { microregion: microregions.error.message } : {}),
    ...(departments.error ? { department: departments.error.message } : {}),
    ...(municipalities.error ? { municipality: municipalities.error.message } : {}),
  };

  const onSelectionChange = (level: GeographyLevel, item: { id: string } | null) => {
    setSelection((current) => {
      const next = { ...current };
      const index = ['macroregion', 'microregion', 'department', 'municipality'].indexOf(level);
      for (const descendant of ['macroregion', 'microregion', 'department', 'municipality'].slice(index + 1)) {
        delete next[descendant as GeographyLevel];
      }
      if (item) next[level] = item.id;
      else delete next[level];
      return next;
    });
  };

  const onPageChange = (level: GeographyLevel, page: number) => {
    if (level === 'macroregion') macroregions.setPage(page);
    if (level === 'microregion') microregions.setPage(page);
    if (level === 'department') departments.setPage(page);
    if (level === 'municipality') municipalities.setPage(page);
  };
  const onPageSizeChange = (level: GeographyLevel, pageSize: number) => {
    if (level === 'macroregion') macroregions.setPageSize(pageSize);
    if (level === 'microregion') microregions.setPageSize(pageSize);
    if (level === 'department') departments.setPageSize(pageSize);
    if (level === 'municipality') municipalities.setPageSize(pageSize);
  };

  const onSave = async (level: GeographyLevel, values: GeographyFormValues, editing?: GeographyRecordView) => {
    if (demoMode) {
      if (editing) {
        setDemoRecords((current) => {
          if (level === 'macroregion') return {
            ...current,
            macroregion: current.macroregion.map((item) => item.id === editing.id
              ? { ...item, name: values.name, code: values.code ?? item.code, is_active: values.isActive === true }
              : item),
          };
          if (level === 'microregion') return {
            ...current,
            microregion: current.microregion.map((item) => item.id === editing.id
              ? { ...item, name: values.name, code: values.code ?? item.code, macroregion_id: values.parentId ?? item.macroregion_id, is_active: values.isActive === true }
              : item),
          };
          if (level === 'department') return {
            ...current,
            department: current.department.map((item) => item.id === editing.id
              ? { ...item, name: values.name, dane_code: values.daneCode ?? item.dane_code, microregion_id: values.parentId ?? item.microregion_id, is_active: values.isActive === true }
              : item),
          };
          return {
            ...current,
            municipality: current.municipality.map((item) => item.id === editing.id
              ? { ...item, name: values.name, dane_code: values.daneCode ?? item.dane_code, department_id: values.parentId ?? item.department_id, is_active: values.isActive === true }
              : item),
          };
        });
        setDemoMessage(`"${values.name}" se actualizo solo en esta sesion de demostracion. No se envio ni guardo en el servidor.`);
        return;
      }
      const id = `demo:${level}:${++demoId.current}`;
      setDemoRecords((current) => {
        if (level === 'macroregion') return { ...current, macroregion: [...current.macroregion, { id, name: values.name, code: values.code ?? '', is_active: values.isActive === true }] };
        if (level === 'microregion') return { ...current, microregion: [...current.microregion, { id, name: values.name, code: values.code ?? '', macroregion_id: values.parentId ?? '', is_active: values.isActive === true }] };
        if (level === 'department') return { ...current, department: [...current.department, { id, name: values.name, dane_code: values.daneCode ?? '', microregion_id: values.parentId ?? '', is_active: values.isActive === true }] };
        return { ...current, municipality: [...current.municipality, { id, name: values.name, dane_code: values.daneCode ?? '', department_id: values.parentId ?? '', is_active: values.isActive === true }] };
      });
      if (level === 'macroregion') macroregions.setPage(1);
      if (level === 'microregion') microregions.setPage(1);
      if (level === 'department') departments.setPage(1);
      if (level === 'municipality') municipalities.setPage(1);
      setDemoMessage(`"${values.name}" se agrego solo en esta sesion de demostracion. No se envio ni guardo en el servidor.`);
      return;
    }
    if (level === 'macroregion') {
      const body = { name: values.name, code: values.code ?? '' };
      if (editing) await macroregions.update(editing.id, body);
      else await macroregions.create(body);
    }
    if (level === 'microregion') {
      const body = { name: values.name, code: values.code ?? '', macroregion_id: values.parentId ?? '' };
      if (editing) await microregions.update(editing.id, body);
      else await microregions.create(body);
    }
    if (level === 'department') {
      const body = { name: values.name, dane_code: values.daneCode ?? '', microregion_id: values.parentId ?? '' };
      if (editing) await departments.update(editing.id, body);
      else await departments.create(body);
    }
    if (level === 'municipality') {
      const body = { name: values.name, dane_code: values.daneCode ?? '', department_id: values.parentId ?? '' };
      if (editing) await municipalities.update(editing.id, body);
      else await municipalities.create(body);
    }
  };

  const onDeactivate = async (level: GeographyLevel, item: GeographyRecordView) => {
    if (level === 'macroregion') await macroregions.deactivate(item.id);
    if (level === 'microregion') await microregions.deactivate(item.id);
    if (level === 'department') await departments.deactivate(item.id);
    if (level === 'municipality') await municipalities.deactivate(item.id);
  };

  const onRetry = (level: GeographyLevel) => {
    if (level === 'macroregion') macroregions.refresh();
    if (level === 'microregion') microregions.refresh();
    if (level === 'department') departments.refresh();
    if (level === 'municipality') municipalities.refresh();
  };

  return (
    <div className={styles.root} data-mfe="reference-data">
      <header className={styles.header}>
        <ParameterizationBackLink />
        {activeSection === 'parameterization' ? (
          <>
            <h1 className={styles.title}>Parametrización / catálogos</h1>
            <p className={styles.description}>
              Administración de catálogos, valores y parámetros del sistema.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Parametrización — Geografía institucional</h1>
            <p className={styles.description}>
              Jerarquía territorial y organizacional donde se ubican los centros y ambientes.
            </p>
          </>
        )}
        {demoMode && (
          <p className={styles.demoNotice} role="status">
            Modo de demostracion local: las creaciones y ediciones solo existen en esta sesion del navegador. No hay conexion al servidor.
            {demoMessage && <> {demoMessage}</>}
          </p>
        )}
      </header>
      <main className={styles.main}>
        <nav className={styles.sectionTabs} aria-label="Secciones de datos de referencia">
          <button
            type="button"
            aria-current={activeSection === 'geography' ? 'page' : undefined}
            onClick={() => setActiveSection('geography')}
          >
            Regionales
          </button>
          {canManageHierarchy && (
            <button
              type="button"
              aria-current={activeSection === 'institutional' ? 'page' : undefined}
              onClick={() => setActiveSection('institutional')}
            >
              Centros y sedes
            </button>
          )}
          {(canViewCatalogs || canViewParameters) && (
            <button
              type="button"
              aria-current={activeSection === 'parameterization' ? 'page' : undefined}
              onClick={() => setActiveSection('parameterization')}
            >
              Catálogos y parámetros
            </button>
          )}
        </nav>
        {activeSection === 'parameterization' ? (
          <Parameterization
            baseUrl={apiBaseUrl}
            demoMode={demoMode}
            canViewCatalogs={canViewCatalogs}
            canManageCatalogs={canManageCatalogs}
            canViewParameters={canViewParameters}
            canManageParameters={canManageParameters}
          />
        ) : activeSection === 'institutional' && canManageHierarchy ? (
          <InstitutionalStructure baseUrl={apiBaseUrl} />
        ) : (
          <GeographyHierarchy
            options={options}
            parentOptions={parentOptions}
            pagination={pagination}
            loadingLevel={loadingLevel}
            errors={errors}
            parentLoading={demoMode ? undefined : parentLoading}
            parentErrors={demoMode ? undefined : parentErrors}
            unavailable={!apiBaseUrl && !demoMode}
            unavailableMessage={!apiBaseUrl && !demoMode ? API_SETUP_MESSAGE : undefined}
            canManage={false}
            allowLocalCreation={demoMode}
            allowLocalEditing={demoMode}
            demoMode={demoMode}
            onSelectionChange={onSelectionChange}
            onPageChange={onPageChange}
            onPageSizeChange={(level, pageSize) => onPageSizeChange(level, pageSize)}
            onSave={onSave}
            onDeactivate={onDeactivate}
            onRetry={onRetry}
          />
        )}
      </main>
    </div>
  );
};

export default App;
