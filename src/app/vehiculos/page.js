import StorageCrudPage from '@/components/StorageCrudPage'

const fields = [
  {
    name: 'marca', label: 'Marca', placeholder: 'Toyota',
    help: 'Marca del vehiculo (ej. Toyota, Hyundai, Kia).',
    colWidth: '10%',
  },
  {
    name: 'modelo', label: 'Modelo', placeholder: 'Corolla Cross',
    help: 'Modelo comercial del vehiculo.',
    colWidth: '13%',
  },
  {
    name: 'anio', label: 'Anio', type: 'number', placeholder: '2026',
    help: 'Anio de fabricacion del vehiculo (4 digitos).',
    colWidth: '7%',
    min: 1990,
    max: 2099,
    step: 1,
  },
  {
    name: 'version', label: 'Version', placeholder: 'XEI 1.8L',
    help: 'Version o equipamiento especifico del vehiculo.',
    required: false,
    colWidth: '17%',
  },
  {
    name: 'color', label: 'Color', placeholder: 'Plata',
    help: 'Color exterior del vehiculo.',
    required: false,
    colWidth: '12%',
  },
  {
    name: 'placa', label: 'Placa', placeholder: 'ABC-123',
    help: 'Placa de rodaje (si ya esta asignada).',
    required: false,
    colWidth: '9%',
  },
  {
    name: 'precioVenta', label: 'Precio de venta', type: 'number', placeholder: '85000',
    help: 'Precio total de venta al publico del vehiculo.',
    colWidth: '11%',
    min: 0,
    step: 100,
  },
  {
    name: 'moneda', label: 'Moneda',
    help: 'Moneda en la que se cotiza el vehiculo.',
    defaultValue: 'PEN',
    colWidth: '7%',
    options: [
      { value: 'PEN', label: 'Soles (PEN)' },
      { value: 'USD', label: 'Dolares (USD)' },
    ],
  },
]

const columnMap = {
  marca:       'marca',
  modelo:      'modelo',
  anio:        'anio',
  version:     'version',
  color:       'color',
  placa:       'placa',
  precioVenta: 'precio_venta',
  moneda:      'moneda',
}

export default function VehiculosPage() {
  return (
    <StorageCrudPage
      table="vehiculos"
      title="Vehiculos"
      subtitle="Catalogo de vehiculos usados en las ofertas financieras."
      fields={fields}
      columnMap={columnMap}
      emptyText="Aun no hay vehiculos registrados."
    />
  )
}
