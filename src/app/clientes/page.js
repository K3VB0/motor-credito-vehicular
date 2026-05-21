import StorageCrudPage from '@/components/StorageCrudPage'

const fields = [
  {
    name: 'nombres', label: 'Nombres', placeholder: 'Juan Carlos',
    help: 'Nombres del cliente, tal como figuran en su DNI.',
    colWidth: '11%',
  },
  {
    name: 'apellidos', label: 'Apellidos', placeholder: 'Perez Ramirez',
    help: 'Apellidos paterno y materno del cliente.',
    colWidth: '12%',
  },
  {
    name: 'dni', label: 'DNI', placeholder: '12345678',
    help: 'Numero de DNI del cliente (8 digitos). Debe ser unico en el sistema.',
    colWidth: '8%',
  },
  {
    name: 'email', label: 'Correo', type: 'email', placeholder: 'cliente@correo.com',
    help: 'Correo electronico para enviar el cronograma y notificaciones.',
    required: false,
    colWidth: '15%',
  },
  {
    name: 'telefono', label: 'Telefono', placeholder: '999999999',
    help: 'Numero de contacto del cliente. Recomendado: celular peruano de 9 digitos.',
    required: false,
    colWidth: '9%',
  },
  {
    name: 'direccion', label: 'Direccion', placeholder: 'Av. Javier Prado 123',
    help: 'Direccion de domicilio del cliente.',
    required: false,
    colWidth: '17%',
  },
  {
    name: 'ingresosMes', label: 'Ingreso mensual', type: 'number', placeholder: '5000',
    help: 'Ingreso bruto mensual declarado por el cliente. Se usa para evaluar capacidad de pago.',
    required: false,
    colWidth: '8%',
    min: 0,
    step: 100,
  },
  {
    name: 'empleador', label: 'Empleador', placeholder: 'Empresa S.A.',
    help: 'Nombre de la empresa o entidad donde labora el cliente.',
    required: false,
    colWidth: '13%',
  },
]

const columnMap = {
  nombres:     'nombres',
  apellidos:   'apellidos',
  dni:         'dni',
  email:       'email',
  telefono:    'telefono',
  direccion:   'direccion',
  ingresosMes: 'ingresos_mes',
  empleador:   'empleador',
}

export default function ClientesPage() {
  return (
    <StorageCrudPage
      table="clientes"
      title="Clientes"
      subtitle="Registro de clientes interesados en credito vehicular."
      fields={fields}
      columnMap={columnMap}
      emptyText="Aun no hay clientes registrados."
    />
  )
}
