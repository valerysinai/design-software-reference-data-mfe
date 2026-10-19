import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../../src/App.js';
import {
  GeographyHierarchy,
  type GeographyOptions,
} from '../../src/adapter/in/components/GeographyHierarchy.js';

const options: GeographyOptions = {
  macroregion: [
    { id: 'macro-1', name: 'Macrorregión Norte', code: 'NOR' },
    { id: 'macro-2', name: 'Macrorregión Sur', code: 'SUR' },
  ],
  microregion: [{ id: 'micro-1', name: 'Microrregión A', code: 'MIA', parentId: 'macro-1' }],
  department: [{ id: 'department-1', name: 'Departamento A', daneCode: '01001', parentId: 'micro-1' }],
  municipality: [{ id: 'municipality-1', name: 'Municipio A', daneCode: '01001001', parentId: 'department-1' }],
};


const multipleParentsOptions: GeographyOptions = {
  macroregion: [
    { id: 'macro-1', name: 'Macrorregión Norte', code: 'NOR' },
    { id: 'macro-2', name: 'Macrorregión Sur', code: 'SUR' },
  ],
  microregion: [
    { id: 'micro-1', name: 'Microrregión Norte 1', code: 'N1', parentId: 'macro-1' },
    { id: 'micro-2', name: 'Microrregión Norte 2', code: 'N2', parentId: 'macro-1' },
    { id: 'micro-3', name: 'Microrregión Sur 1', code: 'S1', parentId: 'macro-2' },
  ],
  department: [
    { id: 'department-1', name: 'Departamento de Norte 1', daneCode: '01001', parentId: 'micro-1' },
    { id: 'department-2', name: 'Departamento de Norte 2', daneCode: '01002', parentId: 'micro-1' },
    { id: 'department-3', name: 'Departamento de Norte 2B', daneCode: '02001', parentId: 'micro-2' },
    { id: 'department-4', name: 'Departamento de Sur 1', daneCode: '03001', parentId: 'micro-3' },
  ],
  municipality: [
    { id: 'municipality-1', name: 'Municipio Norte 1', daneCode: '01001001', parentId: 'department-1' },
    { id: 'municipality-2', name: 'Municipio Norte 1B', daneCode: '01001002', parentId: 'department-1' },
    { id: 'municipality-3', name: 'Municipio Norte 2', daneCode: '01002001', parentId: 'department-2' },
    { id: 'municipality-4', name: 'Municipio Sur 1', daneCode: '03001001', parentId: 'department-4' },
  ],
};

const pagination = {
  macroregion: { page: 2, pageSize: 20, totalItems: 25, totalPages: 2 },
  microregion: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  department: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  municipality: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

describe('GeographyHierarchy', () => {
  afterEach(cleanup);

  it('recorre niveles, conserva el padre elegido y limpia descendientes al cambiarlo', () => {
    const onSelectionChange = vi.fn();
    render(<GeographyHierarchy options={multipleParentsOptions} onSelectionChange={onSelectionChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Microrregión Norte 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Departamento de Norte 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Municipio Norte 1' }));
    expect(screen.getByRole('heading', { name: 'Municipios' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Macrorregiones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Sur' }));
    expect(screen.getByRole('tab', { name: 'Microrregiones' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Microrregión Norte 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Microrregión Sur 1' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Microrregión Sur 1' }));
    expect(screen.queryByRole('button', { name: 'Departamento de Norte 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Departamento de Sur 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Departamento de Sur 1' }));
    expect(screen.queryByRole('button', { name: 'Municipio Norte 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Municipio Sur 1' })).toBeTruthy();
    expect(onSelectionChange).toHaveBeenLastCalledWith('department', multipleParentsOptions.department[3]);
  });

  it('presenta cuatro pestañas accesibles y admite navegación por teclado', () => {
    render(<GeographyHierarchy options={options} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Macrorregiones',
      'Microrregiones',
      'Departamentos',
      'Municipios',
    ]);

    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Microrregiones' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Microrregiones' })).toBe(document.activeElement);
  });

  it('presenta el estado disponible como badge y no inventa uno cuando falta', () => {
    const statusOptions: GeographyOptions = {
      ...options,
      macroregion: [
        { id: 'active', name: 'Macrorregión activa', code: 'ACT', isActive: true },
        { id: 'inactive', name: 'Macrorregión inactiva', code: 'INA', isActive: false },
        { id: 'unknown', name: 'Estado no recibido', code: 'UNK' },
      ],
    };
    render(<GeographyHierarchy options={statusOptions} />);

    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeTruthy();
    expect(screen.getByText('Activo')).toBeTruthy();
    expect(screen.getByText('Inactivo')).toBeTruthy();
    expect(screen.getByText('No informado')).toBeTruthy();
  });

  it('muestra carga, error y lista vacía en el nivel seleccionado', () => {
    const { rerender } = render(<GeographyHierarchy options={options} />);
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    expect(screen.getByRole('heading', { name: 'Microrregiones' })).toBeTruthy();

    rerender(<GeographyHierarchy options={options} loadingLevel="microregion" />);
    expect(screen.getByRole('status').textContent).toContain('Cargando microrregiones');

    rerender(<GeographyHierarchy options={options} errors={{ microregion: 'No fue posible consultar.' }} />);
    expect(screen.getByRole('alert').textContent).toContain('No fue posible consultar.');

    rerender(<GeographyHierarchy options={{ ...options, microregion: [] }} />);
    expect(screen.getByText('No hay registros para mostrar.')).toBeTruthy();
  });


  it('filtra microrregiones por macrorregión y departamentos por microrregión', () => {
    render(<GeographyHierarchy options={multipleParentsOptions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    expect(screen.getByRole('table', { name: 'Microrregiones' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Microrregión Norte 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Microrregión Norte 2' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Microrregión Sur 1' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Microrregión Norte 1' }));
    expect(screen.getByRole('button', { name: 'Departamento de Norte 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Departamento de Norte 2' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Departamento de Norte 2B' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Departamento de Sur 1' })).toBeNull();
  });

  it('filtra municipios por departamento y deja macrorregiones sin filtro geográfico', () => {
    render(<GeographyHierarchy options={multipleParentsOptions} />);
    expect(screen.getByRole('button', { name: 'Macrorregión Norte' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Macrorregión Sur' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Microrregión Norte 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Departamento de Norte 1' }));
    expect(screen.getByRole('button', { name: 'Municipio Norte 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Municipio Norte 1B' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Municipio Norte 2' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Municipio Sur 1' })).toBeNull();
  });

  it('muestra la columna del padre en microrregiones y municipios como en las referencias', () => {
    render(<GeographyHierarchy options={multipleParentsOptions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    expect(screen.getByRole('columnheader', { name: 'Macrorregión' })).toBeTruthy();
    expect(screen.getAllByRole('cell', { name: 'Macrorregión Norte' })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Microrregión Norte 1' }));

    expect(screen.queryByRole('columnheader', { name: 'Microrregión' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Departamento de Norte 1' }));
    expect(screen.getByRole('columnheader', { name: 'Departamento' })).toBeTruthy();
    expect(screen.getAllByRole('cell', { name: 'Departamento de Norte 1' })).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'DANE' })).toBeTruthy();
  });

  it('limpia resultados de padres anteriores y deshabilita acciones si falta seleccionar padre', () => {
    render(<GeographyHierarchy options={multipleParentsOptions} canManage onSave={vi.fn()} onDeactivate={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Microrregiones' }));
    expect(screen.getByRole('status').textContent).toContain('Selecciona primero una macrorregión');
    expect(screen.queryByRole('table')).toBeNull();
    const createMicroregion = screen.getByRole('button', { name: 'Nueva microrregión' }) as HTMLButtonElement;
    expect(createMicroregion.disabled).toBe(false);
    fireEvent.click(createMicroregion);
    const microregionForm = screen.getByRole('form', { name: 'Crear Microrregiones' });
    expect((within(microregionForm).getAllByRole('combobox')[0] as HTMLSelectElement).options).toHaveLength(3);
    fireEvent.click(within(microregionForm).getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Macrorregiones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    expect(screen.queryByRole('button', { name: 'Microrregión Sur 1' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Macrorregiones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Sur' }));
    expect(screen.queryByRole('button', { name: 'Microrregión Norte 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Microrregión Sur 1' })).toBeTruthy();
  });

  it('muestra vacío cuando no existen hijos del padre seleccionado', () => {
    const noChildren = { ...multipleParentsOptions, municipality: [] };
    render(<GeographyHierarchy options={noChildren} />);
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Microrregión Norte 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Departamento de Norte 1' }));
    expect(screen.getByText('No hay registros para mostrar.')).toBeTruthy();
  });

  it('conserva el filtro del padre al solicitar otra página', () => {
    const onPageChange = vi.fn();
    const pageOptions = { ...multipleParentsOptions, pagination: undefined };
    render(<GeographyHierarchy options={pageOptions} pagination={{ ...pagination, microregion: { page: 1, pageSize: 1, totalItems: 2, totalPages: 2 } }} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    expect(screen.getByRole('button', { name: 'Microrregión Norte 1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Microrregión Sur 1' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(onPageChange).toHaveBeenCalledWith('microregion', 2);
    expect(screen.getByRole('button', { name: 'Microrregión Norte 2' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Microrregión Sur 1' })).toBeNull();
  });

  it('valida la longitud del nombre y envía los campos visibles de macrorregión', async () => {
    const onSave = vi.fn();
    render(<GeographyHierarchy options={options} canManage onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nueva macrorregión' }));
    const form = screen.getByRole('form', { name: 'Crear Macrorregiones' });
    fireEvent.change(within(form).getByLabelText(/Nombre/), {
      target: { value: 'x'.repeat(101) },
    });
    fireEvent.submit(form);

    expect(screen.getByRole('alert').textContent).toContain('máximo 100 caracteres');
    expect(onSave).not.toHaveBeenCalled();
    expect((within(form).getByLabelText(/Nombre/) as HTMLInputElement).maxLength).toBe(100);

    fireEvent.change(within(form).getByLabelText(/Nombre/), { target: { value: 'Norte' } });
    fireEvent.change(within(form).getByLabelText(/Código/), { target: { value: 'NOR' } });
    fireEvent.change(within(form).getByRole('combobox', { name: /Estado/ }), { target: { value: 'true' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.submit(form);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('macroregion', { name: 'Norte', isActive: true, code: 'NOR' }));
  });

  it('requiere seleccionar la macrorregión al crear una microrregión', () => {
    const onSave = vi.fn();
    render(<GeographyHierarchy options={options} canManage onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva microrregión' }));
    const form = screen.getByRole('form', { name: 'Crear Microrregiones' });
    fireEvent.change(within(form).getByLabelText(/Nombre/), { target: { value: 'Centro' } });
    fireEvent.change(within(form).getByLabelText(/Código/), { target: { value: 'CEN' } });
    fireEvent.change(within(form).getByRole('combobox', { name: /Estado/ }), { target: { value: 'true' } });
    fireEvent.change(within(form).getByLabelText(/Macrorregión/), { target: { value: '' } });
    fireEvent.submit(form);

    expect(screen.getByRole('alert').textContent).toContain('Selecciona una macrorregión');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('edita un departamento y conserva su relación padre y el código DANE', async () => {
    const onSave = vi.fn();
    render(<GeographyHierarchy options={options} canManage onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Microrregión A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Departamento A' }));
    const form = screen.getByRole('form', { name: 'Editar Departamentos' });
    expect((within(form).getByLabelText(/Código DANE/) as HTMLInputElement).maxLength).toBe(5);
    fireEvent.change(within(form).getByLabelText(/Nombre/), { target: { value: 'Departamento B' } });
    fireEvent.change(within(form).getByRole('combobox', { name: /Estado/ }), { target: { value: 'false' } });
    fireEvent.submit(form);

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        'department',
        { name: 'Departamento B', isActive: false, parentId: 'micro-1', daneCode: '01001' },
        options.department[0],
      ),
    );
  });

  it('conserva los límites de campos y selectores padres obligatorios en los cuatro formularios', () => {
    render(<GeographyHierarchy options={options} canManage onSave={vi.fn()} />);
    const openForm = (buttonName: string, formName: string) => {
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe('geography-form-title');
      const form = screen.getByRole('form', { name: formName });
      const status = within(form).getByRole('combobox', { name: /Estado/ }) as HTMLSelectElement;
      expect(status.required).toBe(true);
      expect(Array.from(status.options).slice(1).map((option) => option.text)).toEqual(['Active', 'Inactive']);
      return form;
    };
    const cancel = (form: HTMLElement) => fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));

    let form = openForm('Nueva macrorregión', 'Crear Macrorregiones');
    expect((within(form).getByLabelText(/Nombre/) as HTMLInputElement).maxLength).toBe(100);
    expect((within(form).getByLabelText(/Código/) as HTMLInputElement).maxLength).toBe(10);
    cancel(form);

    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    form = openForm('Nueva microrregión', 'Crear Microrregiones');
    expect((within(form).getByLabelText(/Nombre/) as HTMLInputElement).maxLength).toBe(100);
    expect((within(form).getByLabelText(/Código/) as HTMLInputElement).maxLength).toBe(10);
    expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).required).toBe(true);
    cancel(form);

    fireEvent.click(screen.getByRole('button', { name: 'Microrregión A' }));
    form = openForm('Nuevo departamento', 'Crear Departamentos');
    expect((within(form).getByLabelText(/Nombre/) as HTMLInputElement).maxLength).toBe(100);
    expect((within(form).getByLabelText(/Código DANE/) as HTMLInputElement).maxLength).toBe(5);
    expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).required).toBe(true);
    cancel(form);

    fireEvent.click(screen.getByRole('button', { name: 'Departamento A' }));
    form = openForm('Nuevo municipio', 'Crear Municipios');
    expect((within(form).getByLabelText(/Nombre/) as HTMLInputElement).maxLength).toBe(150);
    expect((within(form).getByLabelText(/Código DANE/) as HTMLInputElement).maxLength).toBe(8);
    expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).required).toBe(true);
  });

  it('mantiene cada formulario ligado a su pestaña y descarta el estado al cambiar de nivel', () => {
    render(<GeographyHierarchy options={options} canManage onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nueva macrorregión' }));
    expect(screen.getByRole('form', { name: 'Crear Macrorregiones' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Microrregiones' }));
    expect(screen.queryByRole('form')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Macrorregiones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva microrregión' }));
    let form = screen.getByRole('form', { name: 'Crear Microrregiones' });
    expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).required).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Departamentos' }));
    expect(screen.queryByRole('form')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Microrregiones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Microrregión A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo departamento' }));
    form = screen.getByRole('form', { name: 'Crear Departamentos' });
    expect(within(form).getByLabelText(/Código DANE/)).toBeTruthy();
    expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).required).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Municipios' }));
    expect(screen.queryByRole('form')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Departamentos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Departamento A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo municipio' }));
    form = screen.getByRole('form', { name: 'Crear Municipios' });
    expect(within(form).getByLabelText(/Código DANE/)).toBeTruthy();
    expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).required).toBe(true);
    fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo municipio' }));
    form = screen.getByRole('form', { name: 'Crear Municipios' });
    expect((within(form).getByLabelText(/Nombre/) as HTMLInputElement).value).toBe('');
  });

  it('abre Crear en los cuatro niveles aun sin padres y explica la selección requerida', () => {
    const noRecords: GeographyOptions = {
      macroregion: [],
      microregion: [],
      department: [],
      municipality: [],
    };
    render(<GeographyHierarchy options={noRecords} parentOptions={noRecords} canManage onSave={vi.fn()} />);

    const childLevels = [
      { tab: 'Microrregiones', create: 'Nueva microrregión', form: 'Crear Microrregiones', parent: 'Macrorregión' },
      { tab: 'Departamentos', create: 'Nuevo departamento', form: 'Crear Departamentos', parent: 'Microrregión' },
      { tab: 'Municipios', create: 'Nuevo municipio', form: 'Crear Municipios', parent: 'Departamento' },
    ];
    const openAndCheck = (createName: string, formName: string, parentName?: string) => {
      const createButton = screen.getByRole('button', { name: createName }) as HTMLButtonElement;
      expect(createButton.disabled).toBe(false);
      fireEvent.click(createButton);
      const form = screen.getByRole('form', { name: formName });
      expect(within(form).getByLabelText(/Nombre/)).toBeTruthy();
      if (parentName) {
        expect(within(form).getByLabelText(new RegExp(parentName))).toBeTruthy();
        expect(within(form).getByRole('status').textContent).toContain('No hay');
        expect(within(form).getByRole('status').textContent).toContain('disponibles');
        expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).disabled).toBe(true);
      }
      fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('form')).toBeNull();
    };

    openAndCheck('Nueva macrorregión', 'Crear Macrorregiones');
    for (const level of childLevels) {
      fireEvent.click(screen.getByRole('tab', { name: level.tab }));
      openAndCheck(level.create, level.form, level.parent);
    }
  });

  it('muestra el rango de registros y permite cambiar de página con callbacks existentes', () => {
    const onPageChange = vi.fn();
    render(<GeographyHierarchy options={options} pagination={pagination} onPageChange={onPageChange} />);

    expect(screen.getByText('Mostrando 21–25 de 25')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    expect(onPageChange).toHaveBeenCalledWith('macroregion', 1);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onPageChange).toHaveBeenCalledWith('macroregion', 2);
    expect(screen.getByRole('button', { name: /Siguiente/ }).hasAttribute('disabled')).toBe(true);
  });

  it('ofrece tamaños 10, 20 y 50 y solicita el reinicio a página uno manteniendo el padre', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <GeographyHierarchy
        options={multipleParentsOptions}
        pagination={{ microregion: { page: 2, pageSize: 20, totalItems: 25, totalPages: 2 } }}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));

    const pageSize = screen.getByRole('combobox', { name: 'Registros por página' });
    expect(Array.from((pageSize as HTMLSelectElement).options).map((option) => option.value)).toEqual([
      '10',
      '20',
      '50',
    ]);
    fireEvent.change(pageSize, { target: { value: '50' } });

    expect(onPageSizeChange).toHaveBeenCalledWith('microregion', 50, 1);
    expect(onPageChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Microrregión Norte 1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Microrregión Sur 1' })).toBeNull();
  });

  it('confirma la desactivación y deshabilita acciones sin capacidad explícita', async () => {
    const onDeactivate = vi.fn();
    const { rerender } = render(<GeographyHierarchy options={options} onDeactivate={onDeactivate} />);
    expect((screen.getByRole('button', { name: /Desactivar Macrorregión Norte/ }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<GeographyHierarchy options={options} canManage onDeactivate={onDeactivate} />);
    fireEvent.click(screen.getByRole('button', { name: /Desactivar Macrorregión Norte/ }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación' }));
    await waitFor(() => expect(onDeactivate).toHaveBeenCalledWith('macroregion', options.macroregion[0]));
  });

  it('mantiene la confirmación abierta cuando falla el callback de desactivación', async () => {
    const onDeactivate = vi.fn().mockRejectedValue(new Error('conflicto sin clasificar'));
    render(<GeographyHierarchy options={options} canManage onDeactivate={onDeactivate} />);
    fireEvent.click(screen.getByRole('button', { name: /Desactivar Macrorregión Norte/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No fue posible desactivar el registro');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('rechaza un padre obsoleto que ya no está entre las opciones disponibles', () => {
    const onSave = vi.fn();
    render(
      <GeographyHierarchy
        options={options}
        parentOptions={{ macroregion: [] }}
        canManage
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva microrregión' }));
    const form = screen.getByRole('form', { name: 'Crear Microrregiones' });
    fireEvent.change(within(form).getByLabelText(/Nombre/), { target: { value: 'Centro' } });
    fireEvent.change(within(form).getByLabelText(/Código/), { target: { value: 'CEN' } });
    fireEvent.submit(form);

    expect(screen.getByRole('alert').textContent).toContain('Selecciona una macrorregión');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('explica carga, error y ausencia de opciones en el selector del padre', () => {
    const onRetry = vi.fn();
    const onSave = vi.fn();
    const { rerender } = render(
      <GeographyHierarchy
        options={options}
        parentLoading={{ macroregion: true }}
        canManage
        onSave={onSave}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Macrorregión Norte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nueva microrregión' }));
    const form = screen.getByRole('form', { name: 'Crear Microrregiones' });
    expect(within(form).getByRole('status').textContent).toContain('Cargando opciones de macrorregión');
    expect((within(form).getAllByRole('combobox')[0] as HTMLSelectElement).disabled).toBe(true);
    expect((within(form).getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <GeographyHierarchy
        options={options}
        parentErrors={{ macroregion: 'Error de consulta' }}
        canManage
        onSave={onSave}
        onRetry={onRetry}
      />,
    );
    expect(within(form).getByRole('alert').textContent).toContain('Error de consulta');
    fireEvent.click(within(form).getByRole('button', { name: 'Reintentar opciones' }));
    expect(onRetry).toHaveBeenCalledWith('macroregion');

    rerender(
      <GeographyHierarchy
        options={options}
        parentOptions={{ macroregion: [] }}
        canManage
        onSave={onSave}
        onRetry={onRetry}
      />,
    );
    expect(within(form).getByRole('status').textContent).toContain('No hay macrorregiones disponibles');
    expect((within(form).getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('conserva el formulario y sus datos cuando falla la operación de guardado', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fallo de prueba'));
    render(<GeographyHierarchy options={options} canManage onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nueva macrorregión' }));
    const form = screen.getByRole('form', { name: 'Crear Macrorregiones' });
    fireEvent.change(within(form).getByLabelText(/Nombre/), { target: { value: 'Nombre conservado' } });
    fireEvent.change(within(form).getByLabelText(/Código/), { target: { value: 'NCO' } });
    fireEvent.change(within(form).getByRole('combobox', { name: /Estado/ }), { target: { value: 'true' } });
    fireEvent.submit(form);

    expect((await within(form).findByRole('alert')).textContent).toContain('No fue posible guardar');
    expect((within(form).getByLabelText(/Nombre/) as HTMLInputElement).value).toBe('Nombre conservado');
    expect((within(form).getByLabelText(/Código/) as HTMLInputElement).value).toBe('NCO');
    expect(within(form).getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('gestiona el foco, el ciclo de tabulación y Escape en la confirmación', () => {
    render(<GeographyHierarchy options={options} canManage onDeactivate={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /Desactivar Macrorregión Norte/ });
    fireEvent.click(trigger);

    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    const confirm = screen.getByRole('button', { name: 'Confirmar desactivación' });
    expect(document.activeElement).toBe(cancel);

    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(cancel, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('gestiona el foco y Escape en el formulario modal', () => {
    render(<GeographyHierarchy options={options} canManage onSave={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Nueva macrorregión' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    const first = within(dialog).getByRole('combobox', { name: /Estado/ });
    const save = within(dialog).getByRole('button', { name: 'Guardar' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('presenta la demostración local sin filas ficticias en App', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Parametrización — Geografía institucional' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Modo de demostracion local');
    expect(screen.getByRole('tablist', { name: 'Niveles geográficos' })).toBeTruthy();
    expect(screen.queryByRole('row', { name: /Norte|Sur/ })).toBeNull();
    expect(screen.getByText('No hay registros locales de demostracion para mostrar.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Nueva macrorregión' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
