export type ParameterizationIcon =
  | 'book'
  | 'building'
  | 'clock'
  | 'folder'
  | 'key'
  | 'map'
  | 'settings';

export interface ParameterizationCard {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: ParameterizationIcon;
  requiredAnyPermission: readonly string[];
}

// Inventario confirmado a partir de pantallas ya construidas o en construcción.
// Monitoreo y estados de actores se agregarán cuando IAM publique sus features.
export const AVAILABLE_PARAMETERIZATION_CARDS: readonly ParameterizationCard[] = [
  {
    id: 'curriculum',
    title: 'Currículo académico',
    description: 'Líneas, redes, programas, competencias y resultados de aprendizaje.',
    route: '/admin/parametrizacion/curriculo',
    icon: 'book',
    requiredAnyPermission: ['ACADEMIC_PROGRAM_VIEW', 'ACADEMIC_PROGRAM_MANAGE'],
  },
  {
    id: 'schedules',
    title: 'Jornadas / franjas',
    description: 'Franjas horarias utilizadas para construir y organizar los horarios.',
    route: '/admin/parametrizacion/jornadas',
    icon: 'clock',
    requiredAnyPermission: ['SCH_CREATE', 'SCH_EDIT'],
  },
  {
    id: 'environments',
    title: 'Tipos de ambiente e inventario',
    description: 'Tipos de ambiente, inventario y reglas de disponibilidad.',
    route: '/admin/parametrizacion/ambientes',
    icon: 'building',
    requiredAnyPermission: ['ENV_MANAGE'],
  },
  {
    id: 'geography',
    title: 'Geografía institucional',
    description: 'Macroregiones, microregiones, departamentos y municipios.',
    route: '/admin/parametrizacion/geografia',
    icon: 'map',
    requiredAnyPermission: ['REF_HIERARCHY_MANAGE'],
  },
  {
    id: 'rbac',
    title: 'RBAC — roles y permisos',
    description: 'Roles, módulos, permisos y asignaciones de acceso.',
    route: '/admin/parametrizacion/rbac',
    icon: 'key',
    requiredAnyPermission: ['IDENTITY_ROLE_VIEW', 'IDENTITY_ROLE_MANAGE'],
  },
  {
    id: 'catalogs',
    title: 'Catálogos y parámetros',
    description: 'Catálogos genéricos, valores y parámetros del sistema.',
    route: '/backoffice/parametrizacion',
    icon: 'settings',
    requiredAnyPermission: ['REF_CATALOG_VIEW', 'REF_PARAMETER_VIEW'],
  },
  {
    id: 'reference-data',
    title: 'Datos de referencia',
    description: 'Centros de formación, sedes y unidades institucionales.',
    route: '/admin/datos-referencia',
    icon: 'folder',
    requiredAnyPermission: ['REF_HIERARCHY_MANAGE'],
  },
];

export function getVisibleParameterizationCards(
  cards: readonly ParameterizationCard[],
  permissions: readonly string[],
): ParameterizationCard[] {
  const grantedPermissions = new Set(permissions);

  return cards.filter((card) =>
    card.requiredAnyPermission.some((permission) => grantedPermissions.has(permission)),
  );
}
